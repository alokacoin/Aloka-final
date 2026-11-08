import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 300 },
  answer: { type: String, required: true, trim: true, maxlength: 3000 }
}, { _id: false });

const serviceAuditSchema = new mongoose.Schema({
  action: { type: String, required: true, maxlength: 80 },
  changedFields: { type: [String], default: [] },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  at: { type: Date, default: Date.now }
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 160 },
  title: { type: String, trim: true, maxlength: 160 },
  slug: { type: String, trim: true, lowercase: true, maxlength: 180, unique: true, sparse: true },
  description: { type: String, trim: true, maxlength: 10000 },
  shortDescription: { type: String, trim: true, maxlength: 500, default: '' },
  fee: { type: String, trim: true, default: '' },
  badge: { type: String, trim: true, default: '' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', default: null },
  categorySlug: { type: String, trim: true, lowercase: true, default: '' },
  tags: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  coverImage: { url: { type: String, default: '' }, publicId: { type: String, default: '' }, alt: { type: String, default: '' } },
  gallery: { type: [{ url: String, publicId: String, alt: String }], default: [] },
  whatsIncluded: { type: [String], default: [] },
  targetAudience: { type: [String], default: [] },
  requiredDocuments: { type: [String], default: [] },
  eligibility: { type: String, default: '', maxlength: 5000 },
  processSteps: { type: [String], default: [] },
  estimatedDeliveryTime: { type: String, default: '', maxlength: 120 },
  pricingType: { type: String, enum: ['fixed', 'starting_from', 'quotation', 'free_consultation'], default: 'quotation' },
  price: { type: Number, min: 0, default: null },
  currency: { type: String, default: 'INR', maxlength: 3 },
  pricingNotes: { type: String, default: '', maxlength: 1000 },
  serviceFormat: { type: String, enum: ['online', 'offline', 'both'], default: 'both' },
  requiredQualifications: { type: [String], default: [] },
  licenseRequirements: { type: [String], default: [] },
  restrictedToQualifiedProfessional: { type: Boolean, default: false },
  professionalVerificationNotes: { type: String, default: '', maxlength: 1000 },
  faqs: { type: [faqSchema], default: [] },
  status: { type: String, enum: ['draft', 'published', 'unpublished', 'archived'], default: 'draft', index: true },
  isFeatured: { type: Boolean, default: false },
  isPopular: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 100 },
  seoTitle: { type: String, default: '', maxlength: 160 },
  seoDescription: { type: String, default: '', maxlength: 320 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedAt: { type: Date, default: null },
  auditHistory: { type: [serviceAuditSchema], default: [] }
}, { timestamps: true, minimize: false });

serviceSchema.pre('validate', function setLegacyFields(next) {
  if (!this.title && this.name) this.title = this.name;
  if (!this.name && this.title) this.name = this.title;
  if (!this.shortDescription && this.description) this.shortDescription = this.description.slice(0, 500);
  if (!this.description && this.shortDescription) this.description = this.shortDescription;
  next();
});

serviceSchema.index({ status: 1, displayOrder: 1, createdAt: -1 });
serviceSchema.index({ categoryId: 1, status: 1 });
serviceSchema.index({ title: 'text', shortDescription: 'text', description: 'text', tags: 'text', keywords: 'text' });

export default mongoose.models.Service || mongoose.model('Service', serviceSchema);
