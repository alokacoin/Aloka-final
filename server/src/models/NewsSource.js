import mongoose from 'mongoose';

const newsSourceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  provider: { type: String, enum: ['rss'], default: 'rss', required: true },
  websiteUrl: { type: String, default: '', maxlength: 2048 },
  feedUrl: { type: String, required: true, maxlength: 2048 },
  logoUrl: { type: String, default: '', maxlength: 2048 },
  country: { type: String, default: 'in', uppercase: true, maxlength: 4 },
  language: { type: String, default: 'en', lowercase: true, maxlength: 12 },
  isActive: { type: Boolean, default: true },
  fetchFrequency: { type: Number, default: 30, min: 15, max: 1440 },
  lastFetchedAt: { type: Date },
  status: { type: String, enum: ['configured', 'healthy', 'degraded', 'disabled'], default: 'configured' },
  configuration: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

newsSourceSchema.index({ feedUrl: 1 }, { unique: true });
newsSourceSchema.index({ isActive: 1, provider: 1 });

export default mongoose.models.NewsSource || mongoose.model('NewsSource', newsSourceSchema);
