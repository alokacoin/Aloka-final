import mongoose from 'mongoose';

const calculatorCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    icon: { type: String, default: 'Calculator', trim: true, maxlength: 60 },
    sortOrder: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

calculatorCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

export default mongoose.models.CalculatorCategory ||
  mongoose.model('CalculatorCategory', calculatorCategorySchema);
