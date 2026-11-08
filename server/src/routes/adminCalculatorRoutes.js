import { Router } from 'express';
import {
  createCalculator,
  createCategory,
  deleteCalculator,
  deleteCategory,
  getAdminCalculator,
  listAdminCalculators,
  listAdminCategories,
  updateCalculator,
  updateCategory
} from '../controllers/adminCalculatorController.js';

const router = Router();

router.get('/categories', listAdminCategories);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/', listAdminCalculators);
router.post('/', createCalculator);
router.get('/:id', getAdminCalculator);
router.patch('/:id', updateCalculator);
router.delete('/:id', deleteCalculator);

export default router;
