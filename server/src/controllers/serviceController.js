import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { z } from 'zod';
import Service from '../models/Service.js';
import ServiceCategory from '../models/ServiceCategory.js';
import ServiceInquiry from '../models/ServiceInquiry.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureServiceCategories, listActiveServiceCategories } from '../services/serviceCategories.js';
import { serviceCategorySchema, serviceInquiryCreateSchema, serviceWriteSchema } from '../services/serviceValidation.js';

const publicListSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  format: z.enum(['online', 'offline', 'both']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  delivery: z.string().trim().max(120).optional(),
  qualification: z.string().trim().max(100).optional(),
  popular: z.enum(['true', 'false']).optional(),
  sort: z.enum(['latest', 'oldest', 'price_low', 'price_high', 'popular']).default('latest'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
}).strict();

const parse = (schema, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map(({ message, path }) => `${path.join('.') || 'request'}: ${message}`).join('; '));
    error.status = 400;
    throw error;
  }
  return parsed.data;
};

const slugify = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 170);
const validId = (id) => mongoose.isValidObjectId(id);
const publicProjection = '-auditHistory -createdBy -updatedBy -deletedAt -__v';
const serviceNotFound = () => ({ success: false, message: 'Service not found.' });
const getActiveCategoryIds = () => ServiceCategory.find({ isActive: true }).distinct('_id');

export const getPublicServiceCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, items: await listActiveServiceCategories() });
});

export const listPublicServices = asyncHandler(async (req, res) => {
  const query = parse(publicListSchema, req.query);
  if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
    return res.status(400).json({ success: false, message: 'Minimum price cannot exceed maximum price.' });
  }
  const activeCategoryIds = await getActiveCategoryIds();
  const filter = { status: 'published', deletedAt: null, categoryId: { $in: activeCategoryIds } };
  if (query.category) {
    const category = await ServiceCategory.findOne({ slug: query.category, isActive: true }).select('_id').lean();
    if (!category) return res.json({ success: true, items: [], pagination: { page: query.page, limit: query.limit, total: 0, pages: 0 } });
    filter.categoryId = category._id;
  }
  if (query.format) filter.serviceFormat = query.format;
  if (query.popular === 'true') filter.isPopular = true;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
    filter.pricingType = { $in: ['fixed', 'starting_from'] };
  }
  if (query.delivery) filter.estimatedDeliveryTime = new RegExp(query.delivery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (query.qualification) filter.requiredQualifications = new RegExp(query.qualification.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const categoryIds = await ServiceCategory.find({ name: new RegExp(escaped, 'i'), isActive: true }).distinct('_id');
    filter.$or = [
      { title: new RegExp(escaped, 'i') },
      { shortDescription: new RegExp(escaped, 'i') },
      { description: new RegExp(escaped, 'i') },
      { tags: new RegExp(escaped, 'i') },
      { keywords: new RegExp(escaped, 'i') },
      ...(categoryIds.length ? [{ categoryId: { $in: categoryIds } }] : [])
    ];
  }
  const sort = {
    latest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_low: { price: 1, createdAt: -1 },
    price_high: { price: -1, createdAt: -1 },
    popular: { isPopular: -1, isFeatured: -1, createdAt: -1 }
  }[query.sort];
  const [items, total] = await Promise.all([
    Service.find(filter).select(publicProjection).populate('categoryId', 'name slug icon description')
      .sort(sort).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    Service.countDocuments(filter)
  ]);
  res.json({ success: true, items, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } });
});

export const getFeaturedServices = asyncHandler(async (_req, res) => {
  const items = await Service.find({ status: 'published', deletedAt: null, categoryId: { $in: await getActiveCategoryIds() }, isFeatured: true })
    .select(publicProjection).populate('categoryId', 'name slug icon').sort({ displayOrder: 1, createdAt: -1 }).limit(12).lean();
  res.json({ success: true, items });
});

export const getPopularServices = asyncHandler(async (_req, res) => {
  const items = await Service.find({ status: 'published', deletedAt: null, categoryId: { $in: await getActiveCategoryIds() }, isPopular: true })
    .select(publicProjection).populate('categoryId', 'name slug icon').sort({ displayOrder: 1, createdAt: -1 }).limit(12).lean();
  res.json({ success: true, items });
});

export const getPublicService = asyncHandler(async (req, res) => {
  const lookup = validId(req.params.idOrSlug) ? { _id: req.params.idOrSlug } : { slug: req.params.idOrSlug };
  const item = await Service.findOne({ ...lookup, status: 'published', deletedAt: null })
    .select(publicProjection).populate('categoryId', 'name slug icon description isActive').lean();
  if (!item) return res.status(404).json(serviceNotFound());
  if (!item.categoryId?.isActive) return res.status(404).json(serviceNotFound());
  const related = await Service.find({
    _id: { $ne: item._id }, categoryId: item.categoryId?._id || item.categoryId,
    status: 'published', deletedAt: null
  }).select('title slug shortDescription coverImage pricingType price currency categoryId serviceFormat')
    .limit(4).lean();
  res.json({ success: true, item, related });
});

const sendInquiryReceipt = async (inquiry) => {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: [inquiry.email],
      subject: `Aloka received your service enquiry (${inquiry.inquiryId})`,
      text: `Hello ${inquiry.fullName},\n\nWe received your enquiry for ${inquiry.serviceTitle}. Your reference is ${inquiry.inquiryId}. Our team will review it and contact you using your preferred method. This does not mean a professional has accepted the engagement.\n\nAloka`
    });
    if (error) {
      console.error('Service inquiry receipt email failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Service inquiry receipt email failed:', error.message);
    return false;
  }
};

export const createPublicServiceInquiry = asyncHandler(async (req, res) => {
  const data = parse(serviceInquiryCreateSchema, req.body);
  const service = await Service.findOne({ _id: data.serviceId, status: 'published', deletedAt: null })
    .select('title').lean();
  if (!service) return res.status(404).json({ success: false, message: 'The selected service is no longer available.' });
  const inquiryId = `AL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  const item = await ServiceInquiry.create({
    inquiryId,
    userId: req.user?.sub || null,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    serviceId: service._id,
    serviceTitle: service.title,
    businessType: data.businessType,
    requirement: data.requirement,
    preferredContactMethod: data.preferredContactMethod,
    preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
    message: data.message,
    history: [{ action: 'submitted', toStatus: 'PENDING', visibleToCustomer: true }]
  });
  const receiptEmailSent = await sendInquiryReceipt(item);
  res.status(201).json({
    success: true,
    message: receiptEmailSent
      ? 'Your enquiry was received and a reference email was sent. This is not confirmation that a professional has accepted the engagement.'
      : 'Your enquiry was received, but we could not send a confirmation email. This is not confirmation that a professional has accepted the engagement.',
    item: { inquiryId: item.inquiryId, id: item._id, status: item.status, receiptEmailSent }
  });
});

export const listAdminServices = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page || '1', 10);
  const limit = Number.parseInt(req.query.limit || '20', 10);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ success: false, message: 'Page must be 1–10000 and limit 1–50.' });
  }
  const filter = { deletedAt: null };
  if (['draft', 'published', 'unpublished', 'archived'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.category && validId(req.query.category)) filter.categoryId = req.query.category;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const pattern = req.query.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ title: new RegExp(pattern, 'i') }, { name: new RegExp(pattern, 'i') }, { shortDescription: new RegExp(pattern, 'i') }];
  }
  const [items, total, counts, inquiries, pendingInquiries] = await Promise.all([
    Service.find(filter).populate('categoryId', 'name slug').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Service.countDocuments(filter),
    Promise.all(['draft', 'published', 'unpublished', 'archived'].map(async (status) => [status, await Service.countDocuments({ deletedAt: null, status })])),
    ServiceInquiry.countDocuments(),
    ServiceInquiry.countDocuments({ status: { $in: ['PENDING', 'UNDER_REVIEW'] } })
  ]);
  res.json({
    success: true, items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: { totalServices: counts.reduce((sum, [, count]) => sum + count, 0), ...Object.fromEntries(counts), totalInquiries: inquiries, pendingInquiries }
  });
});

export const createAdminService = asyncHandler(async (req, res) => {
  const data = parse(serviceWriteSchema, req.body);
  const category = await ServiceCategory.findOne({ _id: data.categoryId, isActive: true });
  if (!category) return res.status(400).json({ success: false, message: 'Choose an active service category.' });
  const slug = data.slug || slugify(data.title) || `service-${randomBytes(4).toString('hex')}`;
  const collision = await Service.exists({ slug });
  if (collision) return res.status(409).json({ success: false, message: 'That service URL is already in use.' });
  const item = await Service.create({
    ...data, name: data.title, fee: data.price === null ? '' : `${data.currency} ${data.price}`,
    slug, categorySlug: category.slug, createdBy: req.user.sub, updatedBy: req.user.sub,
    auditHistory: [{ action: 'created', changedFields: Object.keys(data), actor: req.user.sub }]
  });
  res.status(201).json({ success: true, item });
});

export const getAdminService = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service ID.' });
  const item = await Service.findOne({ _id: req.params.id, deletedAt: null }).populate('categoryId', 'name slug').lean();
  if (!item) return res.status(404).json(serviceNotFound());
  res.json({ success: true, item });
});

export const updateAdminService = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service ID.' });
  const data = parse(serviceWriteSchema, req.body);
  const item = await Service.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return res.status(404).json(serviceNotFound());
  const category = await ServiceCategory.findOne({ _id: data.categoryId, isActive: true });
  if (!category) return res.status(400).json({ success: false, message: 'Choose an active service category.' });
  const slug = data.slug || slugify(data.title) || `service-${randomBytes(4).toString('hex')}`;
  if (await Service.exists({ slug, _id: { $ne: item._id } })) return res.status(409).json({ success: false, message: 'That service URL is already in use.' });
  Object.assign(item, data, {
    name: data.title, fee: data.price === null ? '' : `${data.currency} ${data.price}`,
    slug, categorySlug: category.slug, updatedBy: req.user.sub
  });
  item.auditHistory.push({ action: 'updated', changedFields: Object.keys(data), actor: req.user.sub });
  await item.save();
  res.json({ success: true, item });
});

export const changeAdminServiceStatus = asyncHandler(async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['published', 'unpublished', 'archived', 'draft']) }).strict(), req.body);
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service ID.' });
  const item = await Service.findOne({ _id: req.params.id, deletedAt: null });
  if (!item) return res.status(404).json(serviceNotFound());
  const from = item.status;
  item.status = status;
  item.updatedBy = req.user.sub;
  item.auditHistory.push({ action: `status:${status}`, changedFields: ['status'], actor: req.user.sub });
  await item.save();
  res.json({ success: true, item: { id: item._id, status, from } });
});

export const archiveAdminService = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid service ID.' });
  const item = await Service.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { $set: { status: 'archived', updatedBy: req.user.sub }, $push: { auditHistory: { action: 'archived', changedFields: ['status'], actor: req.user.sub } } },
    { new: true }
  );
  if (!item) return res.status(404).json(serviceNotFound());
  res.json({ success: true, message: 'Service archived. Historical enquiries were preserved.' });
});

export const listAdminServiceCategories = asyncHandler(async (_req, res) => {
  await ensureServiceCategories();
  const items = await ServiceCategory.find().sort({ displayOrder: 1, name: 1 }).lean();
  res.json({ success: true, items });
});

export const saveAdminServiceCategory = asyncHandler(async (req, res) => {
  let input = req.body;
  if (req.params.id) {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid category ID.' });
    const current = await ServiceCategory.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ success: false, message: 'Category not found.' });
    input = { ...current, ...req.body };
  }
  const data = parse(serviceCategorySchema, input);
  const slug = data.slug || slugify(data.name).slice(0, 120) || `category-${randomBytes(4).toString('hex')}`;
  const exists = await ServiceCategory.exists({ $or: [{ slug }, { name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }], ...(req.params.id ? { _id: { $ne: req.params.id } } : {}) });
  if (exists) return res.status(409).json({ success: false, message: 'A service category with that name or URL already exists.' });
  if (req.params.id) {
    const item = await ServiceCategory.findByIdAndUpdate(req.params.id, { $set: { ...data, slug } }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Category not found.' });
    await Service.updateMany({ categoryId: item._id }, { $set: { categorySlug: item.slug } });
    return res.json({ success: true, item });
  }
  const item = await ServiceCategory.create({ ...data, slug });
  res.status(201).json({ success: true, item });
});

export const deleteAdminServiceCategory = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid category ID.' });
  const item = await ServiceCategory.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Category not found.' });
  const count = await Service.countDocuments({ categoryId: item._id, deletedAt: null });
  if (count) return res.status(409).json({ success: false, message: 'Reassign or archive services in this category before deleting it.' });
  await item.deleteOne();
  res.json({ success: true, message: 'Category deleted.' });
});

const customerInquiry = (item) => ({
  id: item._id, inquiryId: item.inquiryId, serviceId: item.serviceId, serviceTitle: item.serviceTitle,
  status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt,
  responseHistory: item.responseHistory.filter((entry) => entry.visibleToCustomer).map(({ note, createdAt, action }) => ({ note, createdAt, action })),
  followUpAt: item.followUpAt, nextStep: item.nextStep
});

export const listUserServiceInquiries = asyncHandler(async (req, res) => {
  const items = await ServiceInquiry.find({ userId: req.user.sub }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, items: items.map(customerInquiry) });
});

export const cancelUserServiceInquiry = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid enquiry ID.' });
  const item = await ServiceInquiry.findOne({ _id: req.params.id, userId: req.user.sub });
  if (!item) return res.status(404).json({ success: false, message: 'Enquiry not found.' });
  if (!['PENDING', 'UNDER_REVIEW'].includes(item.status)) return res.status(409).json({ success: false, message: 'This enquiry can no longer be cancelled.' });
  item.history.push({ action: 'customer_cancelled', fromStatus: item.status, toStatus: 'CANCELLED', actor: req.user.sub, visibleToCustomer: true });
  item.status = 'CANCELLED';
  await item.save();
  res.json({ success: true, item: customerInquiry(item.toObject()) });
});

export const listAdminServiceInquiries = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page || '1', 10);
  const limit = Number.parseInt(req.query.limit || '20', 10);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({ success: false, message: 'Page must be 1–10000 and limit 1–50.' });
  }
  const filter = {};
  const statuses = ['PENDING', 'UNDER_REVIEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'];
  if (req.query.status && !statuses.includes(req.query.status)) return res.status(400).json({ success: false, message: 'Choose a supported inquiry status.' });
  if (statuses.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.serviceId) {
    if (!validId(req.query.serviceId)) return res.status(400).json({ success: false, message: 'Invalid service ID.' });
    filter.serviceId = req.query.serviceId;
  }
  if (req.query.from || req.query.to) {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) {
      return res.status(400).json({ success: false, message: 'Provide a valid inquiry date range.' });
    }
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const pattern = req.query.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = ['fullName', 'email', 'inquiryId', 'phone', 'serviceTitle'].map((field) => ({ [field]: new RegExp(pattern, 'i') }));
  }
  const [items, total] = await Promise.all([
    ServiceInquiry.find(filter).populate('assignedTo', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ServiceInquiry.countDocuments(filter)
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const updateAdminServiceInquiry = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid enquiry ID.' });
  const { status, nextStep = '', followUpAt = '' } = parse(z.object({
    status: z.enum(['PENDING', 'UNDER_REVIEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']),
    nextStep: z.string().trim().max(1000).default(''),
    followUpAt: z.string().datetime({ offset: true }).or(z.literal('')).default('')
  }).strict(), req.body);
  const item = await ServiceInquiry.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Enquiry not found.' });
  const from = item.status;
  item.status = status;
  item.nextStep = nextStep;
  item.followUpAt = followUpAt ? new Date(followUpAt) : null;
  item.history.push({ action: 'status_updated', fromStatus: from, toStatus: status, actor: req.user.sub, visibleToCustomer: true });
  await item.save();
  res.json({ success: true, item });
});

export const addAdminServiceInquiryNote = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid enquiry ID.' });
  const { note } = parse(z.object({ note: z.string().trim().min(1).max(4000) }).strict(), req.body);
  const item = await ServiceInquiry.findByIdAndUpdate(req.params.id, { $push: { adminNotes: note, history: { action: 'internal_note', note, actor: req.user.sub } } }, { new: true });
  if (!item) return res.status(404).json({ success: false, message: 'Enquiry not found.' });
  res.json({ success: true, item });
});

export const respondToAdminServiceInquiry = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid enquiry ID.' });
  const { response } = parse(z.object({ response: z.string().trim().min(1).max(4000) }).strict(), req.body);
  const item = await ServiceInquiry.findById(req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Enquiry not found.' });
  item.responseHistory.push({ action: 'customer_response', note: response, actor: req.user.sub, visibleToCustomer: true });
  item.history.push({ action: 'customer_response', note: response, actor: req.user.sub, visibleToCustomer: true });
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to: [item.email], subject: `Update on Aloka enquiry ${item.inquiryId}`, text: response });
    if (result.error) {
      console.error('Service inquiry response email failed:', result.error.message);
      return res.status(502).json({ success: false, message: 'The response could not be emailed. It was not saved; check email configuration and retry.' });
    }
  } else {
    return res.status(503).json({ success: false, message: 'Email responses are not configured on this server.' });
  }
  await item.save();
  res.json({ success: true, item });
});
