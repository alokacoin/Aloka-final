import mongoose from 'mongoose';
import { isIP } from 'node:net';
import { z } from 'zod';
import News from '../models/News.js';
import NewsCategory from '../models/NewsCategory.js';
import NewsSource from '../models/NewsSource.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureNewsCategories } from '../services/newsCategories.js';
import { fetchNews, getRecentNewsFetchLogs, hasConfiguredNewsSources } from '../services/newsFetchService.js';

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  description: z.string().trim().max(500).optional().default(''),
  image: z.string().url().max(2048).optional().default(''),
  icon: z.string().trim().max(40).optional().default('newspaper'),
  order: z.number().int().min(0).max(1000).optional().default(100),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional().default(true)
}).strict();

const updateCategorySchema = categorySchema.partial().strict();

const updateNewsSchema = z.object({
  status: z.enum(['published', 'hidden', 'archived', 'rejected']).optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  categorySlug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  title: z.string().trim().min(1).max(300).optional(),
  summary: z.string().trim().min(1).max(2000).optional(),
  imageUrl: z.string().url().max(2048).refine((value) => new URL(value).protocol === 'https:', 'Image URLs must use HTTPS.').or(z.literal('')).optional()
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

const invalidInput = (parsed) => {
  const error = new Error(parsed.error.issues.map(({ message, path }) =>
    `${path.join('.') || 'body'}: ${message}`).join('; '));
  error.status = 400;
  return error;
};

const sourceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  websiteUrl: z.string().url().max(2048).optional().default(''),
  feedUrl: z.string().url().max(2048),
  logoUrl: z.string().url().max(2048).optional().default(''),
  country: z.string().trim().regex(/^[a-zA-Z]{2,4}$/).optional().default('IN'),
  language: z.string().trim().regex(/^[a-zA-Z-]{2,12}$/).optional().default('en'),
  isActive: z.boolean().optional().default(true),
  fetchFrequency: z.number().int().min(15).max(1440).optional().default(30)
}).strict();
const sourceUpdateSchema = sourceSchema.partial().strict();

const isSafeExternalUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.hostname.toLowerCase() !== 'localhost' &&
      !url.hostname.toLowerCase().endsWith('.localhost') &&
      !url.hostname.toLowerCase().endsWith('.local') &&
      !isIP(url.hostname.replace(/^\[|\]$/g, ''));
  } catch {
    return false;
  }
};

const sourceProjection = 'name provider websiteUrl feedUrl logoUrl country language isActive fetchFrequency lastFetchedAt status createdAt updatedAt';

export const listAdminNews = asyncHandler(async (req, res) => {
  await ensureNewsCategories();
  const status = req.query.status || 'pending_review';
  if (!['pending_review', 'published', 'hidden', 'archived', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a supported news status.' });
  }
  const page = Number.parseInt(req.query.page || '1', 10);
  const limit = Number.parseInt(req.query.limit || '20', 10);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ success: false, message: 'News page must be 1–10000 and limit 1–50.' });
  }
  const filter = status === 'published'
    ? { $or: [{ status }, { status: { $exists: false }, isApproved: true }] }
    : { status };
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    if (req.query.search.length > 100) return res.status(400).json({ success: false, message: 'Search must be 100 characters or fewer.' });
    const pattern = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$and = [{ $or: ['title', 'summary', 'source', 'sourceName'].map((field) => ({ [field]: { $regex: pattern, $options: 'i' } })) }];
  }
  if (typeof req.query.category === 'string' && req.query.category) filter.categorySlug = req.query.category.slice(0, 80);
  if (typeof req.query.source === 'string' && req.query.source) filter.source = req.query.source.slice(0, 160);
  const [items, total, categories, logs] = await Promise.all([
    News.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('provider title slug summary canonicalUrl imageUrl source sourceUrl author tags category categorySlug publishedAt fetchedAt status moderationStatus isFeatured isTrending isPinned')
      .lean(),
    News.countDocuments(filter),
    NewsCategory.find().sort({ displayOrder: 1, order: 1, name: 1 }).lean(),
    getRecentNewsFetchLogs()
  ]);
  res.json({ success: true, items, pagination: { page, limit, total }, categories, fetchLogs: logs, fetchConfigured: await hasConfiguredNewsSources() });
});

export const listAdminNewsSources = asyncHandler(async (_req, res) => {
  const items = await NewsSource.find().select(sourceProjection).sort({ name: 1 }).lean();
  res.json({ success: true, items });
});

export const createAdminNewsSource = asyncHandler(async (req, res) => {
  const parsed = sourceSchema.safeParse(req.body);
  if (!parsed.success) throw invalidInput(parsed);
  if (!isSafeExternalUrl(parsed.data.feedUrl) || !isSafeExternalUrl(parsed.data.websiteUrl) || !isSafeExternalUrl(parsed.data.logoUrl)) {
    return res.status(400).json({ success: false, message: 'Source, feed, and logo URLs must be safe HTTPS URLs on public hosts.' });
  }
  const item = await NewsSource.create({
    ...parsed.data,
    provider: 'rss',
    country: parsed.data.country.toUpperCase(),
    language: parsed.data.language.toLowerCase(),
    status: parsed.data.isActive ? 'configured' : 'disabled'
  });
  res.status(201).json({ success: true, item: { ...item.toObject(), configuration: undefined } });
});

export const updateAdminNewsSource = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid source ID.' });
  const parsed = sourceUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw invalidInput(parsed);
  if (['feedUrl', 'websiteUrl', 'logoUrl'].some((field) => parsed.data[field] && !isSafeExternalUrl(parsed.data[field]))) {
    return res.status(400).json({ success: false, message: 'Source, feed, and logo URLs must be safe HTTPS URLs on public hosts.' });
  }
  const update = {
    ...parsed.data,
    ...(parsed.data.country ? { country: parsed.data.country.toUpperCase() } : {}),
    ...(parsed.data.language ? { language: parsed.data.language.toLowerCase() } : {}),
    ...(parsed.data.isActive !== undefined ? { status: parsed.data.isActive ? 'configured' : 'disabled' } : {})
  };
  const item = await NewsSource.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).select(sourceProjection).lean();
  if (!item) return res.status(404).json({ success: false, message: 'News source not found.' });
  res.json({ success: true, item });
});

export const updateAdminNews = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid news ID.' });
  const parsed = updateNewsSchema.safeParse(req.body);
  if (!parsed.success) throw invalidInput(parsed);
  const data = parsed.data;
  if (data.categorySlug) {
    const category = await NewsCategory.exists({ slug: data.categorySlug, isActive: true });
    if (!category) return res.status(400).json({ success: false, message: 'Choose an active news category.' });
    data.category = (await NewsCategory.findOne({ slug: data.categorySlug }).select('name').lean()).name;
  }
  if (data.status) {
    if (data.status === 'published') data.moderationStatus = 'approved';
    if (data.status === 'rejected') data.moderationStatus = 'rejected';
    data.isApproved = data.status === 'published';
  }
  const adminEditedFields = Object.keys(parsed.data);
  const item = await News.findByIdAndUpdate(
    req.params.id,
    { $set: { ...data }, $addToSet: { adminEditedFields: { $each: adminEditedFields } } },
    { new: true, runValidators: true }
  ).select('title status moderationStatus isApproved isFeatured isTrending isPinned category categorySlug').lean();
  if (!item) return res.status(404).json({ success: false, message: 'News story not found.' });
  res.json({ success: true, item });
});

export const runAdminNewsFetch = asyncHandler(async (_req, res) => {
  if (!await hasConfiguredNewsSources()) {
    return res.status(503).json({ success: false, message: 'Configure at least one approved news provider or RSS source before fetching.' });
  }
  const result = await fetchNews({ throwOnError: true });
  res.json({ success: true, item: result });
});

export const getAdminNewsLogs = asyncHandler(async (_req, res) => {
  res.json({ success: true, items: await getRecentNewsFetchLogs() });
});

export const createNewsCategory = asyncHandler(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) throw invalidInput(parsed);
  const item = await NewsCategory.create(parsed.data);
  res.status(201).json({ success: true, item });
});

export const updateNewsCategory = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid category ID.' });
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) throw invalidInput(parsed);
  const item = await NewsCategory.findByIdAndUpdate(req.params.id, { $set: parsed.data }, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ success: false, message: 'News category not found.' });
  res.json({ success: true, item });
});
