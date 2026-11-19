import { analyzeReviewWithAi } from './aiService.js';
import { getCachedAnalyses, setCachedAnalysesBatch } from './cacheService.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 5;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES, 10) || 3;
const BASE_DELAY_MS = parseInt(process.env.BASE_DELAY_MS, 10) || 1000;

/**
 * Utility: Sleep with Promise
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executes a function with Exponential Backoff on Rate Limits (429) or Server Errors (500/503)
 * (Core Requirement 5)
 */
export async function withExponentialBackoff(fn, retries = MAX_RETRIES, baseDelay = BASE_DELAY_MS) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const isRateLimit = err.status === 429 || (err.message && err.message.includes('429'));
      const isServerError = err.status >= 500 && err.status < 600;

      if ((isRateLimit || isServerError) && attempt <= retries) {
        // Delay formula: baseDelay * 2^(attempt-1) + jitter
        const jitter = Math.random() * 200;
        const delay = baseDelay * Math.pow(2, attempt - 1) + jitter;
        console.warn(`[Batch Worker]: Hit ${err.status || 'Rate Limit/Server Error'}. Retrying attempt ${attempt}/${retries} after ${Math.round(delay)}ms...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Chunk an array into sub-arrays of size N
 */
export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process a batch of reviews end-to-end:
 * 1. Checks SHA-256 Cache (Instant Hit)
 * 2. Resolves In-File Duplicates
 * 3. Batches un-cached reviews into chunks of 5 (Core Requirement 5)
 * 4. Calls AI with Exponential Backoff
 * 5. Caches new results into MongoDB / Memory Cache
 * 6. Returns fully populated review records and performance telemetry
 */
export async function processReviewBatch(inspectedReviews) {
  const startTime = Date.now();
  let aiCallsCount = 0;
  let cacheHitsCount = 0;

  // 1. Separate valid reviews from empty reviews
  const emptyReviews = [];
  const validCandidates = [];

  for (const review of inspectedReviews) {
    if (review.is_empty) {
      emptyReviews.push({
        ...review,
        status: 'skipped_empty',
        sentiment: null,
        topics: [],
        summary: 'Empty review skipped.',
        needs_reply: false,
      });
    } else {
      validCandidates.push(review);
    }
  }

  // 2. Query Cache for valid reviews by SHA-256 hash (Core Requirement 6)
  const allHashes = validCandidates.map((r) => r.text_hash);
  const cacheMap = await getCachedAnalyses(allHashes);

  const pendingAiList = [];
  const intermediateResults = new Map();

  for (const review of validCandidates) {
    if (cacheMap.has(review.text_hash)) {
      // Instant Cache Hit!
      const cached = cacheMap.get(review.text_hash);
      cacheHitsCount++;
      intermediateResults.set(review.review_id, {
        ...review,
        status: 'analyzed',
        sentiment: cached.sentiment,
        topics: cached.topics,
        summary: cached.summary,
        needs_reply: cached.needs_reply,
        from_cache: true,
      });
    } else if (review.is_duplicate) {
      // In-batch duplicate: will inherit analysis from master review
      // Keep in intermediateResults for now, will resolve after AI calls
    } else {
      // Needs AI analysis
      pendingAiList.push(review);
    }
  }

  // 3. Batch un-cached reviews into chunks of 5 (Core Requirement 5)
  const batches = chunkArray(pendingAiList, BATCH_SIZE);
  const newlyAnalyzedForCache = [];

  for (const batch of batches) {
    // Process items in batch with concurrency and backoff
    const batchPromises = batch.map(async (review) => {
      aiCallsCount++;
      const result = await withExponentialBackoff(() => analyzeReviewWithAi(review));

      if (result.status === 'analyzed' && result.analysis) {
        newlyAnalyzedForCache.push({
          text_hash: review.text_hash,
          analysis: result.analysis,
        });

        intermediateResults.set(review.review_id, {
          ...review,
          status: 'analyzed',
          sentiment: result.analysis.sentiment,
          topics: result.analysis.topics,
          summary: result.analysis.summary,
          needs_reply: result.analysis.needs_reply,
          from_cache: false,
          model: result.model,
          provider: result.provider,
        });
      } else {
        // Analysis failed gracefully
        intermediateResults.set(review.review_id, {
          ...review,
          status: 'analysis_failed',
          sentiment: null,
          topics: [],
          summary: 'Analysis failed schema validation.',
          needs_reply: false,
          error: result.error,
        });
      }
    });

    await Promise.all(batchPromises);
  }

  // 4. Save newly analyzed items to MongoDB / Memory Cache
  if (newlyAnalyzedForCache.length > 0) {
    await setCachedAnalysesBatch(newlyAnalyzedForCache);
  }

  // 5. Resolve in-batch duplicates (e.g. R015 inherits R012's analysis)
  for (const review of validCandidates) {
    if (review.is_duplicate) {
      cacheHitsCount++; // Duplicate counted as saved AI call!
      const masterReview = intermediateResults.get(review.duplicate_of);
      if (masterReview) {
        intermediateResults.set(review.review_id, {
          ...review,
          status: 'duplicate_reused',
          sentiment: masterReview.sentiment,
          topics: masterReview.topics,
          summary: masterReview.summary,
          needs_reply: masterReview.needs_reply,
          from_cache: true,
          duplicate_of: review.duplicate_of,
        });
      }
    }
  }

  // 6. Assemble final ordered list of reviews
  const finalReviews = [];
  for (const orig of inspectedReviews) {
    if (orig.is_empty) {
      finalReviews.push(emptyReviews.find((r) => r.review_id === orig.review_id));
    } else {
      const analyzed = intermediateResults.get(orig.review_id);
      if (analyzed) {
        // Calculate Rating Mismatch (Bonus Feature 1)
        const rating = analyzed.rating;
        const sentiment = analyzed.sentiment;
        let ratingMismatch = false;

        if (rating !== null && sentiment) {
          if (rating >= 4 && sentiment === 'negative') ratingMismatch = true;
          if (rating <= 2 && sentiment === 'positive') ratingMismatch = true;
        }

        if (ratingMismatch) {
          analyzed.rating_mismatch = true;
          if (!analyzed.diagnostics.badges.some((b) => b.code === 'RATING_MISMATCH')) {
            analyzed.diagnostics.badges.push({
              code: 'RATING_MISMATCH',
              label: `${rating}★ vs ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}`,
              tone: 'amber',
            });
          }
        }

        finalReviews.push(analyzed);
      }
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    reviews: finalReviews,
    stats: {
      totalProcessed: inspectedReviews.length,
      aiCallsCount,
      cacheHitsCount,
      durationMs,
      cacheHitRate:
        inspectedReviews.length > 0
          ? Math.round((cacheHitsCount / inspectedReviews.length) * 100)
          : 0,
    },
  };
}
