import { Router } from 'express';
import {
  getInquirySummary,
  listInquiries,
  updateInquiryStatus
} from '../controllers/adminInquiryController.js';

const router = Router();

router.get('/summary', getInquirySummary);
router.get('/', listInquiries);
router.patch('/:id', updateInquiryStatus);

export default router;
