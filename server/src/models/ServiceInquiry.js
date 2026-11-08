import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  action: { type: String, required: true, maxlength: 80 },
  fromStatus: { type: String, default: '' },
  toStatus: { type: String, default: '' },
  note: { type: String, default: '', maxlength: 4000 },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  visibleToCustomer: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const serviceInquirySchema = new mongoose.Schema({
  inquiryId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null, index: true },
  serviceTitle: { type: String, required: true, maxlength: 160 },
  businessType: { type: String, required: true, enum: ['individual', 'freelancer', 'startup', 'business', 'company'] },
  requirement: { type: String, required: true, trim: true, maxlength: 3000 },
  preferredContactMethod: { type: String, required: true, enum: ['email', 'phone', 'whatsapp'] },
  preferredDate: { type: Date, default: null },
  message: { type: String, default: '', trim: true, maxlength: 3000 },
  status: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'], default: 'PENDING', index: true },
  adminNotes: { type: [String], default: [] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  responseHistory: { type: [historySchema], default: [] },
  history: { type: [historySchema], default: [] },
  followUpAt: { type: Date, default: null },
  nextStep: { type: String, default: '', maxlength: 1000 }
}, { timestamps: true });

serviceInquirySchema.index({ userId: 1, createdAt: -1 });
serviceInquirySchema.index({ status: 1, createdAt: -1 });
serviceInquirySchema.index({ email: 1, createdAt: -1 });

export default mongoose.models.ServiceInquiry || mongoose.model('ServiceInquiry', serviceInquirySchema);
