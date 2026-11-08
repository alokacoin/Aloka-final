import mongoose from 'mongoose';

const newsFetchLogSchema = new mongoose.Schema({
  provider: { type: String, default: 'multiple', maxlength: 200 },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  status: { type: String, enum: ['running', 'completed', 'partial', 'failed'], required: true },
  fetched: { type: Number, default: 0 },
  inserted: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  duplicates: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  errorMessages: { type: [String], default: [] },
  executionDuration: { type: Number, default: 0 }
}, { timestamps: true });
newsFetchLogSchema.index({ startedAt: -1 });
newsFetchLogSchema.index({ provider: 1, startedAt: -1 });

const newsFetchLockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  runId: { type: mongoose.Schema.Types.ObjectId, required: true },
  leaseExpiresAt: { type: Date, required: true }
}, { versionKey: false });

export const NewsFetchLog = mongoose.models.NewsFetchLog || mongoose.model('NewsFetchLog', newsFetchLogSchema);
export const NewsFetchLock = mongoose.models.NewsFetchLock || mongoose.model('NewsFetchLock', newsFetchLockSchema);
