import mongoose from 'mongoose';

const serviceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  icon: { type: String, default: 'briefcase-business', maxlength: 50 },
  image: { type: String, default: '', maxlength: 2048 },
  displayOrder: { type: Number, default: 100, min: 0, max: 10000 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

serviceCategorySchema.index({ isActive: 1, displayOrder: 1, name: 1 });

export default mongoose.models.ServiceCategory || mongoose.model('ServiceCategory', serviceCategorySchema);
