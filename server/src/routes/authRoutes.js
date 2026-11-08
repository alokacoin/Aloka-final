import { Router } from 'express';
import {
  completeGoogleLogin,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  startGoogleLogin
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);
router.post('/logout', logoutUser);
router.get('/google', startGoogleLogin);
router.get('/google/callback', completeGoogleLogin);

export default router;
