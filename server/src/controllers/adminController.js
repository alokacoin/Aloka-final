import Blog from '../models/Blog.js';
import Inquiry from '../models/Inquiry.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAdminSummary = asyncHandler(async (_req, res) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_value, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return {
      date,
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      name: date.toLocaleString('en', { month: 'short', timeZone: 'UTC' })
    };
  });
  const start = months[0].date;
  const [totalUsers, publishedBlogs, unpublishedBlogs, openInquiries, userActivity, blogActivity] = await Promise.all([
    User.countDocuments(),
    Blog.countDocuments({ status: 'published' }),
    Blog.countDocuments({ status: { $ne: 'published' } }),
    Inquiry.countDocuments({ status: { $in: ['new', 'reviewed'] } }),
    User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }
    ]),
    Blog.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }
    ])
  ]);
  const usersByMonth = new Map(userActivity.map(({ _id, count }) => [_id, count]));
  const blogsByMonth = new Map(blogActivity.map(({ _id, count }) => [_id, count]));
  const activity = months.map(({ key, name }) => ({
    month: name,
    users: usersByMonth.get(key) || 0,
    blogs: blogsByMonth.get(key) || 0
  }));
  res.json({
    success: true,
    stats: { totalUsers, publishedBlogs, unpublishedBlogs, openInquiries },
    activity
  });
});
