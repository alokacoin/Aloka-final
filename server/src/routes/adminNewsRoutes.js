import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createNewsCategory,
  createAdminNewsSource,
  getAdminNewsLogs,
  listAdminNews,
  listAdminNewsSources,
  runAdminNewsFetch,
  updateAdminNews,
  updateNewsCategory,
  updateAdminNewsSource
} from '../controllers/adminNewsController.js';

const router = Router();
const fetchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Manual news fetching is limited to two runs every 15 minutes.' }
});

router.get('/', listAdminNews);
router.get('/sources', listAdminNewsSources);
router.post('/sources', createAdminNewsSource);
router.patch('/sources/:id', updateAdminNewsSource);
router.post('/fetch', fetchLimiter, runAdminNewsFetch);
router.get('/fetch-logs', getAdminNewsLogs);
router.patch('/:id', updateAdminNews);
router.post('/categories', createNewsCategory);
router.patch('/categories/:id', updateNewsCategory);

export default router;
