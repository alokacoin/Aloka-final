import mongoose from 'mongoose';
import { z } from 'zod';
import News from '../models/News.js';
import NewsCategory from '../models/NewsCategory.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listActiveNewsCategories } from '../services/newsCategories.js';

const querySchema = z.object({
  category: z.string().trim().max(80).optional(),
  search: z.string().trim().max(100).optional(),
  source: z.string().trim().max(160).optional(),
  country: z.string().trim().max(4).optional(),
  language: z.string().trim().max(12).optional(),
  from: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  sort: z.enum(['newest', 'oldest', 'featured', 'relevance']).default('newest'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  cursor: z.string().max(200).optional(),
  featured: z.enum(['true', 'false']).optional(),
  trending: z.enum(['true', 'false']).optional()
}).strict();

const publishedFilter = {
  $or: [
    { status: 'published', isApproved: true, isHidden: { $ne: true } },
    { status: { $exists: false }, isApproved: true, isHidden: { $ne: true } }
  ]
};

const publicFields = 'title slug summary description source sourceName sourceDomain sourceUrl canonicalUrl originalUrl imageUrl imageAlt imageSource category categorySlug categories tags publishedAt language country isFeatured isTrending author';
const publicProjection = Object.fromEntries([...publicFields.split(' '), '_id'].map((field) => [field, 1]));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toDateBound = (value, isEnd) => {
  const date = new Date(value);
  if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
  return date;
};

const validateQuery = (input) => {
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map(({ message, path }) =>
      `${path.join('.') || 'query'}: ${message}`).join('; '));
    error.status = 400;
    throw error;
  }
  if (parsed.data.from && parsed.data.to && new Date(parsed.data.from) > new Date(parsed.data.to)) {
    const error = new Error('The from date must be earlier than the to date.');
    error.status = 400;
    throw error;
  }
  for (const dateValue of [parsed.data.from, parsed.data.to].filter(Boolean)) {
    if (Number.isNaN(new Date(dateValue).getTime())) {
      const error = new Error('Provide valid dates for the news date range.');
      error.status = 400;
      throw error;
    }
  }
  return parsed.data;
};

const getNewsList = async (req, res, overrides = {}) => {
  const params = validateQuery({ ...req.query, ...overrides });
  const filter = { ...publishedFilter };
  if (params.category && params.category !== 'latest') {
    filter.$and = [{ $or: [{ categorySlug: params.category }, { category: params.category }] }];
  }
  if (params.source) filter.source = params.source;
  if (params.country) filter.country = params.country.toUpperCase();
  if (params.language) filter.language = params.language.toLowerCase();
  if (params.featured === 'true') filter.isFeatured = true;
  if (params.trending === 'true') filter.isTrending = true;
  if (params.from || params.to) {
    filter.publishedAt = {};
    if (params.from) filter.publishedAt.$gte = toDateBound(params.from, false);
    if (params.to) filter.publishedAt.$lte = toDateBound(params.to, true);
  }
  const searchTokens = params.search?.trim().split(/\s+/).filter(Boolean).slice(0, 8) || [];
  if (searchTokens.length) {
    filter.$and = [
      ...(filter.$and || []),
      ...searchTokens.map((token) => {
        const partial = { $regex: escapeRegex(token), $options: 'i' };
        return { $or: ['title', 'description', 'summary', 'source', 'sourceName', 'category', 'tags'].map((field) => ({ [field]: partial })) };
      })
    ];
  }

  let cursorDate = null;
  let cursorId = null;
  if (params.cursor) {
    if (['featured', 'relevance'].includes(params.sort)) {
      const error = new Error('Cursor pagination is available with newest or oldest sorting.');
      error.status = 400;
      throw error;
    }
    try {
      const [date, id, ...extra] = Buffer.from(params.cursor, 'base64url').toString('utf8').split('|');
      cursorDate = new Date(date);
      cursorId = id;
      if (extra.length || Number.isNaN(cursorDate.getTime()) || !/^[a-f\d]{24}$/i.test(cursorId)) throw new Error('Invalid cursor.');
    } catch {
      const error = new Error('The news cursor is invalid.');
      error.status = 400;
      throw error;
    }
  }
  const queryFilter = { ...filter };
  if (cursorDate) {
    queryFilter.$and = [
      ...(queryFilter.$and || []),
      { $or: params.sort === 'oldest'
        ? [{ publishedAt: { $gt: cursorDate } }, { publishedAt: cursorDate, _id: { $gt: cursorId } }]
        : [{ publishedAt: { $lt: cursorDate } }, { publishedAt: cursorDate, _id: { $lt: cursorId } }] }
    ];
  }
  const sort = params.sort === 'oldest'
    ? { publishedAt: 1, _id: 1 }
    : params.sort === 'featured'
      ? { isFeatured: -1, publishedAt: -1, _id: -1 }
      : { publishedAt: -1, _id: -1 };
  const skip = cursorDate ? 0 : (params.page - 1) * params.limit;
  const resultPromise = params.sort === 'relevance' && searchTokens.length
    ? News.aggregate([
      { $match: queryFilter },
      { $addFields: { _searchScore: { $add: searchTokens.map((token) => ({
        $add: ['title', 'description', 'summary', 'sourceName', 'category'].map((field, index) => ({
          $cond: [
            { $regexMatch: { input: { $ifNull: [`$${field}`, ''] }, regex: escapeRegex(token), options: 'i' } },
            [6, 2, 1, 2, 2][index],
            0
          ]
        }))
      })) } } },
      { $sort: { _searchScore: -1, publishedAt: -1, _id: -1 } },
      { $skip: skip },
      { $limit: params.limit + 1 },
      { $project: publicProjection }
    ])
    : News.find(queryFilter).select(publicFields).sort(sort).skip(skip).limit(params.limit + 1).lean();
  const [resultItems, total, latest] = await Promise.all([
    resultPromise,
    News.countDocuments(filter),
    News.findOne(publishedFilter).sort({ fetchedAt: -1 }).select('fetchedAt').lean()
  ]);
  const hasMore = resultItems.length > params.limit;
  const items = resultItems.slice(0, params.limit);
  const last = items.at(-1);
  const nextCursor = hasMore && last
    ? Buffer.from(`${new Date(last.publishedAt).toISOString()}|${last._id.toString()}`).toString('base64url')
    : null;
  res.json({
    success: true,
    items,
    pagination: { page: params.page, limit: params.limit, total, pages: Math.ceil(total / params.limit), hasMore: cursorDate ? hasMore : skip + items.length < total, nextCursor },
    lastUpdatedAt: latest?.fetchedAt || null
  });
};

export const getPublicNews = asyncHandler(getNewsList);

export const getLatestNews = asyncHandler((req, res) => getNewsList(req, res, { sort: 'newest' }));

export const getFeaturedNews = asyncHandler((req, res) => getNewsList(req, res, { featured: 'true', sort: 'featured' }));
export const getTrendingNews = asyncHandler((req, res) => getNewsList(req, res, { trending: 'true', sort: 'newest' }));
export const searchNews = asyncHandler((req, res) => {
  const { q, ...params } = req.query;
  if (typeof q !== 'string' || !q.trim()) {
    const error = new Error('Enter a search term.');
    error.status = 400;
    throw error;
  }
  const query = { ...params, search: q, sort: req.query.sort || 'relevance' };
  return getNewsList({ ...req, query }, res);
});

export const getNewsCategories = asyncHandler(async (_req, res) => {
  const categories = await listActiveNewsCategories();
  const items = await Promise.all(categories.map(async (category) => ({
    ...category,
    count: await News.countDocuments({ ...publishedFilter, categorySlug: category.slug })
  })));
  res.json({ success: true, items: [{ name: 'Latest', slug: 'latest', order: 0, count: items.reduce((sum, item) => sum + item.count, 0) }, ...items] });
});

export const getNewsByCategory = asyncHandler(async (req, res) => {
  const category = await NewsCategory.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!category) return res.status(404).json({ success: false, message: 'News category not found.' });
  return getNewsList(req, res, { category: category.slug });
});

export const getNewsSources = asyncHandler(async (_req, res) => {
  const [names, legacyNames] = await Promise.all([
    News.distinct('sourceName', publishedFilter),
    News.distinct('source', publishedFilter)
  ]);
  res.json({ success: true, items: [...new Set([...names, ...legacyNames].filter(Boolean))].sort((a, b) => a.localeCompare(b)) });
});

export const getNewsCountries = asyncHandler(async (_req, res) => {
  const items = await News.distinct('country', publishedFilter);
  res.json({ success: true, items: items.filter(Boolean).sort() });
});

export const getNewsByIdOrSlug = asyncHandler(async (req, res) => {
  const filter = { ...publishedFilter };
  filter.$and = [mongoose.isValidObjectId(req.params.idOrSlug)
    ? { $or: [{ _id: req.params.idOrSlug }, { slug: req.params.idOrSlug }] }
    : { slug: req.params.idOrSlug }];
  const item = await News.findOne(filter).select(publicFields).lean();
  if (!item) return res.status(404).json({ success: false, message: 'News story not found.' });
  res.json({ success: true, item });
});
