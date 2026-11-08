import { Router } from 'express';
import { deleteAdminBlog, listAdminBlogs } from '../controllers/adminBlogController.js';
import { getAdminSummary } from '../controllers/adminController.js';
import adminInquiryRoutes from './adminInquiryRoutes.js';
import adminNewsRoutes from './adminNewsRoutes.js';
import adminServiceRoutes from './adminServiceRoutes.js';

const router = Router();

router.get('/summary', getAdminSummary);
router.get('/blogs', listAdminBlogs);
router.delete('/blogs/:id', deleteAdminBlog);
router.use('/news', adminNewsRoutes);
router.use('/services', adminServiceRoutes);
router.use('/inquiries', adminInquiryRoutes);

export default router;
