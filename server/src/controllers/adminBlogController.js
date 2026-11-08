import mongoose from 'mongoose';
import { z } from 'zod';
import Blog from '../models/Blog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const moderationSchema = z.object({
  status: z.enum(['published', 'rejected']),
  rejectionMessage: z.string().trim().max(1000).optional().default('')
}).strict();

export const listAdminBlogs = asyncHandler(async (_req, res) => {
  const items = await Blog.find({ status: 'pending' })
    .select('title slug excerpt content category tags author status rejectionMessage updatedAt createdAt')
    .populate({ path: 'author', select: 'name email' })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  res.json({
    success: true,
    items: items.map((blog) => ({
      ...blog,
      author: blog.author ? { name: blog.author.name, email: blog.author.email } : null
    }))
  });
});

export const moderateBlog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
  }
  const parsed = moderationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Choose publish or reject and provide valid review feedback.' });
  }
  const { status, rejectionMessage } = parsed.data;
  if (status === 'rejected' && rejectionMessage.length < 5) {
    return res.status(400).json({ success: false, message: 'Add a short reason when rejecting a blog.' });
  }
  const blog = await Blog.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { $set: { status, rejectionMessage: status === 'rejected' ? rejectionMessage : '' } },
    { new: true, runValidators: true }
  ).lean();
  if (!blog) {
    return res.status(404).json({ success: false, message: 'Pending blog not found.' });
  }
  return res.json({
    success: true,
    item: { id: blog._id.toString(), slug: blog.slug, status: blog.status }
  });
});
