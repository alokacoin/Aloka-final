import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protectOptional } from '../middleware/auth.js';
import {
  createPublicServiceInquiry,
  getFeaturedServices,
  getPopularServices,
  getPublicService,
  getPublicServiceCategories,
  listPublicServices
} from '../controllers/serviceController.js';

const router = Router();
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many service enquiries. Please wait before submitting another.' }
});

router.get('/categories', getPublicServiceCategories);
router.get('/featured', getFeaturedServices);
router.get('/popular', getPopularServices);
router.post('/inquiries', inquiryLimiter, protectOptional, createPublicServiceInquiry);
router.get('/', listPublicServices);
router.get('/:idOrSlug', getPublicService);

export default router;
