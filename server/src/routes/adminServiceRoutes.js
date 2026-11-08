import { Router } from 'express';
import {
  addAdminServiceInquiryNote,
  archiveAdminService,
  changeAdminServiceStatus,
  createAdminService,
  deleteAdminServiceCategory,
  getAdminService,
  listAdminServiceCategories,
  listAdminServiceInquiries,
  listAdminServices,
  respondToAdminServiceInquiry,
  saveAdminServiceCategory,
  updateAdminService,
  updateAdminServiceInquiry
} from '../controllers/serviceController.js';

const router = Router();

router.get('/categories', listAdminServiceCategories);
router.post('/categories', saveAdminServiceCategory);
router.patch('/categories/:id', saveAdminServiceCategory);
router.delete('/categories/:id', deleteAdminServiceCategory);
router.get('/inquiries', listAdminServiceInquiries);
router.patch('/inquiries/:id/status', updateAdminServiceInquiry);
router.post('/inquiries/:id/notes', addAdminServiceInquiryNote);
router.post('/inquiries/:id/respond', respondToAdminServiceInquiry);
router.get('/', listAdminServices);
router.post('/', createAdminService);
router.get('/:id', getAdminService);
router.patch('/:id', updateAdminService);
router.patch('/:id/publish', (req, res, next) => {
  req.body = { ...req.body, status: 'published' };
  next();
}, changeAdminServiceStatus);
router.patch('/:id/unpublish', (req, res, next) => {
  req.body = { ...req.body, status: 'unpublished' };
  next();
}, changeAdminServiceStatus);
router.delete('/:id', archiveAdminService);

export default router;
