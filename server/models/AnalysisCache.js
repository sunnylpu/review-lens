import mongoose from 'mongoose';

const AnalysisCacheSchema = new mongoose.Schema(
  {
    text_hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: true,
    },
    topics: {
      type: [String],
      required: true,
      default: [],
    },
    summary: {
      type: String,
      required: true,
    },
    needs_reply: {
      type: Boolean,
      required: true,
    },
    provider: {
      type: String,
      default: 'kimi',
    },
    model: {
      type: String,
      default: 'moonshot-v1-8k',
    },
    hit_count: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const AnalysisCache = mongoose.models.AnalysisCache || mongoose.model('AnalysisCache', AnalysisCacheSchema);
export default AnalysisCache;
