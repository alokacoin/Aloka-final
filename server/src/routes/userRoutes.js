import { Router } from 'express';
import {
  createUserBookmark,
  createUserBlog,
  deleteUserBlog,
  deleteUserBookmark,
  getUserDashboard,
  getUserBlog,
  listUserBlogs,
  listUserBookmarks,
  submitUserBlog,
  updateUserBlog
} from '../controllers/userController.js';
import { cancelUserServiceInquiry, listUserServiceInquiries } from '../controllers/serviceController.js';

const router = Router();

router.get('/dashboard', getUserDashboard);
router.get('/blogs', listUserBlogs);
router.post('/blogs', createUserBlog);
router.get('/blogs/:id', getUserBlog);
router.patch('/blogs/:id', updateUserBlog);
router.delete('/blogs/:id', deleteUserBlog);
router.post('/blogs/:id/submit', submitUserBlog);
router.get('/bookmarks', listUserBookmarks);
router.post('/bookmarks', createUserBookmark);
router.delete('/bookmarks/:id', deleteUserBookmark);
router.get('/service-inquiries', listUserServiceInquiries);
router.patch('/service-inquiries/:id/cancel', cancelUserServiceInquiry);

export default router;
