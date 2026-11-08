import Inquiry, { inquiryCreateSchema } from '../models/Inquiry.js';
import Blog from '../models/Blog.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const overview = {
  stats: {
    members: '28K+',
    publishedArticles: '1.8K',
    activeNewsSources: '46',
    serviceInquiries: '920+'
  },
  featuredBlogs: [
    {
      id: 1,
      title: 'Tax Planning Strategies for High-Income Professionals',
      category: 'Tax Strategy',
      excerpt: 'A practical framework for structuring deductions, retirement contributions, and timing decisions in volatile markets.',
      author: 'Alicia Morgan',
      readTime: '7 min read'
    },
    {
      id: 2,
      title: 'How CFOs Can Build Resilience in Multi-Market Operations',
      category: 'Finance Leadership',
      excerpt: 'Cash controls, compliance reporting, and scenario planning to help teams stay agile during macro volatility.',
      author: 'Rohan Mehta',
      readTime: '9 min read'
    }
  ]
};

const blogCategories = [
  'Personal Finance',
  'Tax',
  'Investing',
  'Business Finance',
  'Banking',
  'Insurance',
  'Retirement',
  'Financial Literacy'
];

export const getOverview = async (_req, res) => {
  res.json(overview);
};

export const getBlogCategories = asyncHandler(async (_req, res) => {
  const existingCategories = await Blog.distinct('category', {
    status: { $in: ['published', 'pending'] },
    category: { $ne: '' }
  });
  const items = [...new Set([...blogCategories, ...existingCategories])].sort();
  res.json({ success: true, items });
});

export const getBlogs = asyncHandler(async (_req, res) => {
  const items = await Blog.find({ status: 'published' })
    .select('title slug subtitle excerpt category tags coverImage author showAuthor createdAt updatedAt')
    .populate({ path: 'author', select: 'name' })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({
    success: true,
    items: items.map((blog) => ({
      ...blog,
      author: blog.showAuthor ? blog.author?.name || null : null
    })),
    total: items.length
  });
});

export const getBlogBySlug = asyncHandler(async (req, res) => {
  const item = await Blog.findOne({ slug: req.params.slug, status: 'published' })
    .select('title slug subtitle excerpt content category tags coverImage seoTitle seoDescription author showAuthor disclaimer createdAt updatedAt')
    .populate({ path: 'author', select: 'name' })
    .lean();
  if (!item) return res.status(404).json({ success: false, message: 'Article not found.' });
  return res.json({
    success: true,
    item: {
      ...item,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      author: item.showAuthor ? item.author?.name || null : null
    }
  });
});

export const createInquiry = async (req, res, next) => {
  const parsed = inquiryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map(({ message, path }) =>
      `${path.join('.') || 'body'}: ${message}`).join('; '));
    error.status = 400;
    return next(error);
  }

  const inquiry = await Inquiry.create({
    ...parsed.data,
    user: req.user?.sub || null
  });
  res.status(201).json({
    success: true,
    message: 'Inquiry submitted successfully. Our team will be in touch.',
    data: { id: inquiry.id }
  });
};
