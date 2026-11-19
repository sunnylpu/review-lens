import mongoose from 'mongoose';

const UploadBatchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      default: 'reviews.csv',
    },
    source: {
      type: String,
      default: 'csv',
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRows: {
      type: Number,
      default: 0,
    },
    emptyRows: {
      type: Number,
      default: 0,
    },
    duplicateRows: {
      type: Number,
      default: 0,
    },
    aiCallsCount: {
      type: Number,
      default: 0,
    },
    cacheHitsCount: {
      type: Number,
      default: 0,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    healthScore: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
  }
);

export const UploadBatch = mongoose.models.UploadBatch || mongoose.model('UploadBatch', UploadBatchSchema);
export default UploadBatch;
