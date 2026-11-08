import { Router } from 'express';
import {
  getFeaturedNews,
  getLatestNews,
  getNewsByCategory,
  getNewsByIdOrSlug,
  getNewsCategories,
  getNewsCountries,
  getNewsSources,
  getPublicNews,
  getTrendingNews,
  searchNews
} from '../controllers/newsController.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many news searches. Please wait a moment and retry.' }
});

router.get('/', getPublicNews);
router.get('/latest', getLatestNews);
router.get('/trending', getTrendingNews);
router.get('/featured', getFeaturedNews);
router.get('/categories', getNewsCategories);
router.get('/categories/:slug', getNewsByCategory);
router.get('/sources', getNewsSources);
router.get('/countries', getNewsCountries);
router.get('/search', searchLimiter, searchNews);
router.get('/:idOrSlug', getNewsByIdOrSlug);

export default router;
