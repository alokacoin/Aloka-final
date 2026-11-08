import mongoose from 'mongoose';
import { z } from 'zod';

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    subject: { type: String, default: '', trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['new', 'reviewed', 'closed'], default: 'new' }
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ email: 1, createdAt: -1 });

export const inquiryCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  subject: z.string().trim().max(160).optional().default(''),
  message: z.string().trim().min(10).max(5000)
}).strict();

export const inquiryStatusSchema = z.object({
  status: z.enum(['new', 'reviewed', 'closed'])
}).strict();

export default mongoose.models.Inquiry || mongoose.model('Inquiry', inquirySchema);
