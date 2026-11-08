import mongoose from 'mongoose';
import Inquiry, { inquiryStatusSchema } from '../models/Inquiry.js';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';

const querySchema = z.object({
  status: z.enum(['all', 'new', 'reviewed', 'closed']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

const parse = (schema, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map(({ message, path }) =>
      `${path.join('.') || 'request'}: ${message}`).join('; '));
    error.status = 400;
    throw error;
  }
  return parsed.data;
};

const toInquiryResponse = (inquiry) => ({
  id: inquiry._id.toString(),
  name: inquiry.name,
  email: inquiry.email,
  subject: inquiry.subject,
  message: inquiry.message,
  status: inquiry.status,
  createdAt: inquiry.createdAt,
  updatedAt: inquiry.updatedAt
});

export const getInquirySummary = asyncHandler(async (_req, res) => {
  const [newCount, reviewedCount, closedCount] = await Promise.all([
    Inquiry.countDocuments({ status: 'new' }),
    Inquiry.countDocuments({ status: 'reviewed' }),
    Inquiry.countDocuments({ status: 'closed' })
  ]);
  res.json({
    success: true,
    counts: { new: newCount, reviewed: reviewedCount, closed: closedCount, open: newCount + reviewedCount }
  });
});

export const listInquiries = asyncHandler(async (req, res) => {
  const { status, page, limit } = parse(querySchema, req.query);
  const filter = status === 'all' ? {} : { status };
  const [items, total] = await Promise.all([
    Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Inquiry.countDocuments(filter)
  ]);
  res.json({
    success: true,
    items: items.map(toInquiryResponse),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

export const updateInquiryStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    const error = new Error('Invalid inquiry ID.');
    error.status = 400;
    throw error;
  }
  const { status } = parse(inquiryStatusSchema, req.body);
  const inquiry = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true, runValidators: true }
  ).lean();
  if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found.' });
  return res.json({ success: true, item: toInquiryResponse(inquiry) });
});
