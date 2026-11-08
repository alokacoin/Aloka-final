import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  provider: { type: String, enum: ['gnews', 'newsapi', 'rss', 'manual', 'legacy'], default: 'manual' },
  providerArticleId: { type: String },
  alternateProviderIds: { type: [{ provider: String, providerArticleId: String }], default: [] },
  titleSourceKey: { type: String },
  title: { type: String, required: true, trim: true, maxlength: 300 },
  slug: { type: String, trim: true, maxlength: 360 },
  description: { type: String, default: '', trim: true, maxlength: 2000 },
  summary: { type: String, required: true, trim: true, maxlength: 2000 },
  canonicalUrl: { type: String, required: true, maxlength: 2048 },
  originalUrl: { type: String, maxlength: 2048 },
  canonicalKey: { type: String },
  imageUrl: { type: String, default: '', maxlength: 2048 },
  imageAlt: { type: String, default: '', maxlength: 300 },
  imageSource: { type: String, default: '', maxlength: 2048 },
  source: { type: String, required: true, trim: true, maxlength: 160 },
  sourceName: { type: String, trim: true, maxlength: 160 },
  sourceUrl: { type: String, default: '', maxlength: 2048 },
  sourceDomain: { type: String, default: '', maxlength: 255 },
  author: { type: String, default: '', maxlength: 160 },
  language: { type: String, default: 'en', maxlength: 12 },
  country: { type: String, default: 'in', maxlength: 4 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  categorySlug: { type: String, default: 'business', maxlength: 80 },
  secondaryCategories: { type: [String], default: [] },
  categories: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  publishedAt: { type: Date, required: true },
  fetchedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  lastUpdatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending_review', 'published', 'hidden', 'archived', 'rejected'], default: 'pending_review' },
  moderationStatus: { type: String, enum: ['automatic', 'pending_review', 'approved', 'rejected'], default: 'pending_review' },
  isApproved: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'News', default: null },
  relevanceScore: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0, min: 0 },
  adminEditedFields: { type: [String], default: [] }
}, { timestamps: true });

newsSchema.index({ canonicalKey: 1 }, { unique: true, sparse: true });
newsSchema.index({ titleSourceKey: 1 }, { unique: true, sparse: true });
newsSchema.index({ provider: 1, providerArticleId: 1 }, {
  unique: true,
  partialFilterExpression: { providerArticleId: { $type: 'string' } }
});
newsSchema.index({ slug: 1 }, { unique: true, sparse: true });
newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ categorySlug: 1, status: 1, publishedAt: -1 });
newsSchema.index({ isFeatured: 1, status: 1, publishedAt: -1 });
newsSchema.index({ isTrending: 1, status: 1, publishedAt: -1 });
newsSchema.index({ country: 1, language: 1, status: 1, publishedAt: -1 });
newsSchema.index({ title: 'text', description: 'text', summary: 'text', sourceName: 'text', source: 'text', category: 'text', tags: 'text' });

export default mongoose.models.News || mongoose.model('News', newsSchema);
