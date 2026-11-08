import { Router } from 'express';
import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadBlogImage } from '../controllers/blogImageController.js';

const router = Router();

router.post(
  '/',
  protect,
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
  uploadBlogImage
);

export default router;
