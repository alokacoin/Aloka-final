import mongoose from 'mongoose';

const calculatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    shortDescription: { type: String, required: true, trim: true, maxlength: 300 },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalculatorCategory',
      required: true
    },
    categorySlug: { type: String, required: true, lowercase: true, trim: true },
    calculatorType: {
      type: String,
      enum: ['tax', 'gst', 'investment', 'loan', 'banking', 'retirement', 'salary', 'business', 'general'],
      required: true
    },
    icon: { type: String, default: 'Calculator', trim: true, maxlength: 60 },
    keywords: [{ type: String, trim: true, lowercase: true, maxlength: 80 }],
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
    inputSchema: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    outputSchema: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    formulaExplanation: { type: String, default: '', trim: true, maxlength: 4000 },
    assumptions: [{ type: String, trim: true, maxlength: 500 }],
    disclaimer: { type: String, default: '', trim: true, maxlength: 1000 },
    relatedCalculatorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Calculator' }],
    relatedArticleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }],
    seoTitle: { type: String, default: '', trim: true, maxlength: 70 },
    seoDescription: { type: String, default: '', trim: true, maxlength: 200 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isImplemented: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

calculatorSchema.index({ categoryId: 1, isActive: 1, publishedAt: -1 });
calculatorSchema.index({ isActive: 1, isFeatured: 1, sortOrder: 1 });
calculatorSchema.index({ isActive: 1, isPopular: 1, sortOrder: 1 });
calculatorSchema.index({
  name: 'text',
  description: 'text',
  shortDescription: 'text',
  keywords: 'text',
  tags: 'text'
});

export default mongoose.models.Calculator || mongoose.model('Calculator', calculatorSchema);
