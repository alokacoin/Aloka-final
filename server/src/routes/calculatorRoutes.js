import { Router } from 'express';
import {
  getCalculator,
  getCategory,
  listCalculators,
  listCalculatorsByCategory,
  listCategories,
  listFeaturedCalculators,
  listPopularCalculators,
  listRecentCalculators,
  searchCalculators
} from '../controllers/calculatorController.js';

const router = Router();

router.get('/categories', listCategories);
router.get('/categories/:slug', getCategory);
router.get('/category/:slug', listCalculatorsByCategory);
router.get('/featured', listFeaturedCalculators);
router.get('/popular', listPopularCalculators);
router.get('/recent', listRecentCalculators);
router.get('/search', searchCalculators);
router.get('/', listCalculators);
router.get('/:slug', getCalculator);

export default router;
