import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['Blog', 'News', 'Calculator'], required: true },
    target: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetType' }
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Bookmark || mongoose.model('Bookmark', bookmarkSchema);
