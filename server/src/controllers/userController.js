import mongoose from 'mongoose';
import { z } from 'zod';
import Blog, { blogDraftSchema, blogContentSchema } from '../models/Blog.js';
import Bookmark from '../models/Bookmark.js';
import Calculator from '../models/Calculator.js';
import Inquiry from '../models/Inquiry.js';
import News from '../models/News.js';
import ServiceInquiry from '../models/ServiceInquiry.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const bookmarkSchema = z.object({
  targetType: z.enum(['Blog', 'News', 'Calculator']),
  targetId: z.string().regex(/^[a-f\d]{24}$/i)
}).strict();

const parseBody = (schema, input) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map(({ message, path }) =>
      `${path.join('.') || 'body'}: ${message}`).join('; '));
    error.status = 400;
    throw error;
  }
  return parsed.data;
};

const resolveBookmarkTarget = async (targetType, targetId) => {
  if (targetType === 'Blog') {
    return Blog.findOne({ _id: targetId, status: 'published' }).select('_id title slug excerpt category').lean();
  }
  if (targetType === 'News') {
    return News.findOne({ _id: targetId, isApproved: true }).select('_id title source category summary publishedAt').lean();
  }
  return Calculator.findOne({
    _id: targetId,
    isActive: true,
    isImplemented: true,
    isVerified: true,
    publishedAt: { $ne: null, $lte: new Date() }
  }).select('_id name slug shortDescription categorySlug').lean();
};

export const getUserDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.sub;
  const [blogCount, bookmarkCount, inquiryCount, serviceInquiryCount, blogs, inquiries, serviceInquiries, bookmarks] = await Promise.all([
    Blog.countDocuments({ author: userId }),
    Bookmark.countDocuments({ user: userId }),
    Inquiry.countDocuments({ user: userId }),
    ServiceInquiry.countDocuments({ userId }),
    Blog.find({ author: userId })
      .select('title slug status category updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean(),
    Inquiry.find({ user: userId })
      .select('subject status createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    ServiceInquiry.find({ userId })
      .select('inquiryId serviceTitle status createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Bookmark.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'target', select: 'title name slug excerpt summary category source' })
      .lean()
  ]);

  const recentActivity = [
    ...blogs.map((blog) => ({
      id: `blog-${blog._id}`,
      type: 'blog',
      title: blog.title,
      detail: `Your blog is ${blog.status}.`,
      date: blog.updatedAt,
      href: '/user/blogs'
    })),
    ...inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry._id}`,
      type: 'inquiry',
      title: inquiry.subject || 'Contact enquiry',
      detail: `Status: ${inquiry.status}.`,
      date: inquiry.createdAt,
      href: '/contact'
    })),
    ...serviceInquiries.map((inquiry) => ({
      id: `service-inquiry-${inquiry._id}`,
      type: 'service-inquiry',
      title: inquiry.serviceTitle,
      detail: `Service inquiry ${inquiry.inquiryId}: ${inquiry.status}.`,
      date: inquiry.createdAt,
      href: '/dashboard/my-inquiries'
    })),
    ...bookmarks.filter(({ target }) => target).map((bookmark) => ({
      id: `bookmark-${bookmark._id}`,
      type: 'bookmark',
      title: targetTitle(bookmark.target),
      detail: 'Saved to your bookmarks.',
      date: bookmark.createdAt,
      href: bookmark.targetType === 'Calculator' && bookmark.target.slug
        ? `/calculators/${bookmark.target.slug}`
        : '/user/bookmarks'
    }))
  ].sort((left, right) => new Date(right.date) - new Date(left.date)).slice(0, 6);

  res.json({
    success: true,
    stats: { blogs: blogCount, bookmarks: bookmarkCount, inquiries: inquiryCount, serviceInquiries: serviceInquiryCount },
    recentBlogs: blogs,
    recentActivity
  });
});

const targetTitle = (target) => target.title || target.name || 'Saved item';

export const listUserBlogs = asyncHandler(async (req, res) => {
  const items = await Blog.find({ author: req.user.sub })
    .select('title slug excerpt category status rejectionMessage updatedAt createdAt')
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ success: true, items });
});

export const createUserBlog = asyncHandler(async (req, res) => {
  const data = parseBody(blogDraftSchema, req.body || {});
  const blogId = new mongoose.Types.ObjectId();
  const slugBase = normalizeBlogSlug(data.slug || data.title || '') || 'untitled-article';
  const blog = await Blog.create({
    _id: blogId,
    ...data,
    slug: data.slug ? slugBase : `${slugBase}-${blogId.toString().slice(-8)}`,
    author: req.user.sub,
    status: 'draft'
  });

  return res.status(201).json({
    success: true,
    message: 'Draft created.',
    item: toOwnedBlog(blog)
  });
});

const normalizeBlogSlug = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 80);

const toOwnedBlog = (blog) => ({
  id: blog._id.toString(),
  title: blog.title,
  slug: blog.slug,
  subtitle: blog.subtitle,
  category: blog.category,
  excerpt: blog.excerpt,
  content: blog.content,
  tags: blog.tags,
  coverImage: blog.coverImage,
  seoTitle: blog.seoTitle,
  seoDescription: blog.seoDescription,
  showAuthor: blog.showAuthor,
  allowComments: blog.allowComments,
  disclaimer: blog.disclaimer,
  status: blog.status,
  rejectionMessage: blog.rejectionMessage,
  updatedAt: blog.updatedAt
});

export const getUserBlog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
  }
  const blog = await Blog.findOne({ _id: req.params.id, author: req.user.sub });
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
  return res.json({ success: true, item: toOwnedBlog(blog) });
});

export const updateUserBlog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
  }
  const data = parseBody(blogDraftSchema, req.body);
  const blog = await Blog.findOne({ _id: req.params.id, author: req.user.sub });
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
  if (data.slug && data.slug !== blog.slug) {
    const slugTaken = await Blog.exists({ slug: data.slug, _id: { $ne: blog._id } });
    if (slugTaken) return res.status(409).json({ success: false, message: 'That URL slug is already in use.' });
  }
  const withdrawnFromReview = ['pending', 'published'].includes(blog.status);
  if (withdrawnFromReview) blog.status = 'draft';
  Object.assign(blog, data);
  await blog.save();
  return res.json({
    success: true,
    message: withdrawnFromReview
      ? 'Changes saved as a draft. Publish the article again when it is ready.'
      : 'Draft saved.',
    item: toOwnedBlog(blog)
  });
});

export const deleteUserBlog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
  }
  const blog = await Blog.findOneAndDelete({ _id: req.params.id, author: req.user.sub });
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
  return res.json({ success: true, message: 'Article deleted.' });
});

const getContentText = (node) => {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';
  return `${node.text || ''} ${(Array.isArray(node.content) ? node.content : []).map(getContentText).join(' ')}`;
};

export const submitUserBlog = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
  }
  const blog = await Blog.findOne({ _id: req.params.id, author: req.user.sub });
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
  if (!['draft', 'rejected', 'pending'].includes(blog.status)) {
    return res.status(409).json({ success: false, message: 'Only unpublished blogs can be published.' });
  }
  const validContent = blogContentSchema.safeParse(blog.content);
  if (!blog.title.trim() || !blog.category.trim() || !validContent.success ||
      !getContentText(blog.content).trim()) {
    return res.status(400).json({
      success: false,
      message: 'Add a title, choose a category, and write article content before publishing.'
    });
  }
  blog.status = 'published';
  blog.rejectionMessage = '';
  await blog.save();
  return res.json({ success: true, message: 'Your blog is now published.', item: toOwnedBlog(blog) });
});

export const listUserBookmarks = asyncHandler(async (req, res) => {
  const items = await Bookmark.find({ user: req.user.sub })
    .sort({ createdAt: -1 })
    .populate({ path: 'target', select: 'title name slug excerpt summary shortDescription category source' })
    .lean();
  res.json({
    success: true,
    items: items.filter(({ target }) => target).map((bookmark) => ({
      id: bookmark._id.toString(),
      targetType: bookmark.targetType,
      targetId: bookmark.target._id.toString(),
      title: targetTitle(bookmark.target),
      description: bookmark.target.excerpt || bookmark.target.summary ||
        bookmark.target.shortDescription || '',
      category: bookmark.target.category || bookmark.target.categorySlug || '',
      href: bookmark.targetType === 'Calculator'
        ? `/calculators/${bookmark.target.slug}`
        : bookmark.targetType === 'Blog'
          ? `/blogs/${bookmark.target.slug}`
          : null,
      createdAt: bookmark.createdAt
    }))
  });
});

export const createUserBookmark = asyncHandler(async (req, res) => {
  const { targetType, targetId } = parseBody(bookmarkSchema, req.body);
  const target = await resolveBookmarkTarget(targetType, targetId);
  if (!target) {
    return res.status(404).json({
      success: false,
      message: 'Only published articles, approved news, and available calculators can be bookmarked.'
    });
  }

  const bookmark = await Bookmark.findOneAndUpdate(
    { user: req.user.sub, targetType, target: targetId },
    { $setOnInsert: { user: req.user.sub, targetType, target: targetId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.status(201).json({ success: true, item: { id: bookmark.id } });
});

export const deleteUserBookmark = asyncHandler(async (req, res) => {
  const deleted = await Bookmark.findOneAndDelete({ _id: req.params.id, user: req.user.sub });
  if (!deleted) return res.status(404).json({ success: false, message: 'Bookmark not found.' });
  return res.json({ success: true, message: 'Bookmark removed.' });
});
