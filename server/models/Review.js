import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    review_id: {
      type: String,
      required: true,
    },
    product: {
      type: String,
      default: 'General Product',
      index: true,
    },
    rating: {
      type: Number,
      default: null,
    },
    original_rating: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    rating_status: {
      type: String,
      default: 'valid',
    },
    date: {
      type: String,
      default: '',
    },
    original_text: {
      type: String,
      default: '',
    },
    cleaned_text: {
      type: String,
      default: '',
    },
    text_hash: {
      type: String,
      required: true,
      index: true,
    },
    is_empty: {
      type: Boolean,
      default: false,
    },
    is_duplicate: {
      type: Boolean,
      default: false,
    },
    duplicate_of: {
      type: String,
      default: null,
    },
    is_prompt_injection: {
      type: Boolean,
      default: false,
    },
    is_hinglish: {
      type: Boolean,
      default: false,
    },
    is_hindi_script: {
      type: Boolean,
      default: false,
    },
    is_sarcastic: {
      type: Boolean,
      default: false,
    },
    html_sanitized: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'analyzed', 'skipped_empty', 'duplicate_reused', 'analysis_failed'],
      default: 'pending',
      index: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', null],
      default: null,
      index: true,
    },
    topics: {
      type: [String],
      default: [],
      index: true,
    },
    summary: {
      type: String,
      default: '',
    },
    needs_reply: {
      type: Boolean,
      default: false,
      index: true,
    },
    suggested_reply: {
      type: String,
      default: null,
    },
    rating_mismatch: {
      type: Boolean,
      default: false,
      index: true,
    },
    diagnostics: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ badges: [] }),
    },
    raw_source: {
      type: String,
      default: 'csv',
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ batchId: 1, review_id: 1 });
ReviewSchema.index({ product: 1, sentiment: 1 });

export const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
export default Review;
