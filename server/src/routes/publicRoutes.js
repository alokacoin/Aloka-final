import { Router } from 'express';
import { createInquiry, getBlogBySlug, getBlogCategories, getBlogs, getOverview } from '../controllers/publicController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { protectOptional } from '../middleware/auth.js';
import newsRoutes from './newsRoutes.js';
import serviceRoutes from './serviceRoutes.js';

const router = Router();

router.get('/overview', getOverview);
router.get('/blog-categories', getBlogCategories);
router.get('/blogs', getBlogs);
router.get('/blogs/:slug', getBlogBySlug);
router.use('/news', newsRoutes);
router.use('/services', serviceRoutes);
router.post('/inquiries', protectOptional, asyncHandler(createInquiry));

export default router;
