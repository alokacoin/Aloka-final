import mongoose from 'mongoose';
import { z } from 'zod';
import Blog from '../models/Blog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const adminBlogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'draft', 'pending', 'published', 'rejected']).default('all'),
  search: z.string().trim().max(120).default('')
}).strict();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listAdminBlogs = asyncHandler(async (req, res) => {
  const parsed = adminBlogListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid blog list filters.' });
  }
  const { page, limit, status, search } = parsed.data;
  const filter = {};
  if (status !== 'all') filter.status = status;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: expression }, { excerpt: expression }, { category: expression }];
  }

  const [items, total, statusCounts] = await Promise.all([
    Blog.find(filter)
      .select('title slug excerpt category author status updatedAt createdAt')
      .populate({ path: 'author', select: 'name email' })
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Blog.countDocuments(filter),
    Blog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  const counts = Object.fromEntries(statusCounts.map(({ _id, count }) => [_id, count]));
  res.json({
    success: true,
    items: items.map((blog) => ({
      ...blog,
      author: blog.author ? { name: blog.author.name, email: blog.author.email } : null
    })),
    counts: {
      all: Object.values(counts).reduce((sum, count) => sum + count, 0),
      draft: counts.draft || 0,
      pending: counts.pending || 0,
      published: counts.published || 0,
      rejected: counts.rejected || 0
    },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

export const deleteAdminBlog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
  }
  const blog = await Blog.findByIdAndDelete(req.params.id).select('_id title');
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
  return res.json({ success: true, message: 'Blog deleted.' });
});
