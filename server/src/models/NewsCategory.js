import mongoose from 'mongoose';

const newsCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  image: { type: String, default: '', maxlength: 2048 },
  icon: { type: String, default: 'newspaper', maxlength: 40 },
  order: { type: Number, default: 100, min: 0, max: 1000 },
  displayOrder: { type: Number, default: 100, min: 0, max: 1000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

newsCategorySchema.index({ isActive: 1, order: 1, name: 1 });

export default mongoose.models.NewsCategory || mongoose.model('NewsCategory', newsCategorySchema);
