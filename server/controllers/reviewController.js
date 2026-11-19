import crypto from 'crypto';
import { parseUploadedFile } from '../services/multiFormatParser.js';
import { cleanAndAuditReviewBatch } from '../services/cleanerService.js';
import { processReviewBatch } from '../services/batchService.js';
import { generateSuggestedReply } from '../services/aiService.js';
import { getConnectionStatus } from '../config/db.js';
import Review from '../models/Review.js';
import UploadBatch from '../models/UploadBatch.js';

import {
  detectRatingMismatches,
  aggregateProductAnalytics,
  calculateTelemetry,
} from '../services/bonusService.js';

// In-Memory store for reviews and batches when MongoDB is offline
const memoryReviewStore = new Map();
const memoryBatchStore = new Map();

/**
 * Helper to compute Top 3 Complaints and Top 3 Praises across reviews
 */
export function computeTopInsights(reviews = []) {
  const complaints = [];
  const praises = [];

  for (const r of reviews) {
    if (r.status === 'skipped_empty' || !r.summary) continue;

    if (r.sentiment === 'negative') {
      complaints.push({
        review_id: r.review_id,
        product: r.product,
        topic: r.topics?.[0] || 'quality',
        issue: r.summary,
        rating: r.rating,
      });
    } else if (r.sentiment === 'positive') {
      praises.push({
        review_id: r.review_id,
        product: r.product,
        topic: r.topics?.[0] || 'quality',
        praise: r.summary,
        rating: r.rating,
      });
    }
  }

  // Top 3 unique complaints
  const topComplaints = complaints.slice(0, 3);
  // Top 3 unique praises
  const topPraises = praises.slice(0, 3);

  return {
    topComplaints,
    topPraises,
  };
}

/**
 * Helper to compute Global Summary Statistics
 */
export function computeSummaryMetrics(reviews = [], audit = {}, stats = {}) {
  const validReviews = reviews.filter((r) => r.status !== 'skipped_empty');
  const totalAnalyzed = validReviews.length;

  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let needsReplyCount = 0;
  let ratedCount = 0;
  let consistentCount = 0;

  for (const r of validReviews) {
    if (r.sentiment === 'positive') positiveCount++;
    if (r.sentiment === 'neutral') neutralCount++;
    if (r.sentiment === 'negative') negativeCount++;
    if (r.needs_reply) needsReplyCount++;

    if (r.rating !== null && r.sentiment) {
      ratedCount++;
      if (!r.rating_mismatch) consistentCount++;
    }
  }

  const positivePercent = totalAnalyzed > 0 ? Math.round((positiveCount / totalAnalyzed) * 100) : 0;
  const neutralPercent = totalAnalyzed > 0 ? Math.round((neutralCount / totalAnalyzed) * 100) : 0;
  const negativePercent = totalAnalyzed > 0 ? Math.round((negativeCount / totalAnalyzed) * 100) : 0;

  const agreementPercent =
    ratedCount > 0 ? Math.round((consistentCount / ratedCount) * 1000) / 10 : 100;

  const { topComplaints, topPraises } = computeTopInsights(reviews);

  return {
    totalReviews: reviews.length,
    validReviewsCount: totalAnalyzed,
    emptySkippedCount: reviews.length - totalAnalyzed,
    sentiment: {
      positive: { count: positiveCount, percentage: positivePercent },
      neutral: { count: neutralCount, percentage: neutralPercent },
      negative: { count: negativeCount, percentage: negativePercent },
    },
    needsReplyCount,
    ratingAgreement: {
      agreementPercent,
      ratedReviewsCount: ratedCount,
      mismatchedCount: ratedCount - consistentCount,
    },
    topInsights: {
      topComplaints,
      topPraises,
    },
    audit,
    performance: {
      durationMs: stats.durationMs || 0,
      aiCallsCount: stats.aiCallsCount || 0,
      cacheHitsCount: stats.cacheHitsCount || 0,
      cacheHitRate: stats.cacheHitRate || 0,
    },
  };
}

/**
 * POST /api/reviews/upload
 */
export async function uploadReviews(req, res) {
  try {
    const file = req.file;
    const directText = req.body.text;

    if (!file && (!directText || directText.trim() === '')) {
      return res.status(400).json({
        error: 'No file or text payload provided. Please upload a CSV, Excel, PDF, DOCX, JSON file or paste reviews.',
      });
    }

    const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const filename = file ? file.originalname : 'direct_text_paste.txt';
    const rawSource = file ? (file.originalname.split('.').pop() || 'file') : 'paste';

    // 1. Universal Multi-Format Parsing
    const parsedReviews = await parseUploadedFile({
      buffer: file?.buffer,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      text: directText,
    });

    if (!parsedReviews || parsedReviews.length === 0) {
      return res.status(400).json({ error: 'No readable reviews could be extracted from input.' });
    }

    // 2. Broken Store Input Detection & Triage
    const { reviews: inspectedReviews, audit } = cleanAndAuditReviewBatch(parsedReviews);

    // 3. Batching & AI Analysis with Caching & Injection Defense
    const { reviews: finalReviews, stats } = await processReviewBatch(inspectedReviews);

    // Attach batchId to every review
    const enrichedReviews = finalReviews.map((r) => ({
      ...r,
      batchId,
    }));

    // 4. Persistence (MongoDB if available, otherwise Memory store)
    const { isConnected } = getConnectionStatus();
    if (isConnected) {
      try {
        await Review.insertMany(enrichedReviews, { ordered: false });
        await UploadBatch.create({
          batchId,
          filename,
          source: rawSource,
          totalRows: enrichedReviews.length,
          validRows: audit.validForAiCount,
          emptyRows: audit.emptySkipped,
          duplicateRows: audit.duplicatesFound,
          aiCallsCount: stats.aiCallsCount,
          cacheHitsCount: stats.cacheHitsCount,
          durationMs: stats.durationMs,
          healthScore: audit.healthScore,
        });
      } catch (dbErr) {
        console.warn('Failed to save batch to MongoDB:', dbErr.message);
      }
    }

    // Always maintain in memory store for immediate fast queries
    for (const r of enrichedReviews) {
      memoryReviewStore.set(r.review_id, r);
    }
    memoryBatchStore.set(batchId, {
      batchId,
      filename,
      reviews: enrichedReviews,
      audit,
      stats,
    });

    const summary = computeSummaryMetrics(enrichedReviews, audit, stats);

    return res.status(200).json({
      success: true,
      batchId,
      filename,
      summary,
      reviews: enrichedReviews,
    });
  } catch (error) {
    console.error('[uploadReviews Error]:', error);
    return res.status(500).json({
      error: 'Failed to process reviews dataset',
      details: error.message,
    });
  }
}

/**
 * GET /api/reviews
 * Supports filtering by product, sentiment, topic, needs_reply, mismatch, and search keyword
 */
export async function getReviews(req, res) {
  try {
    const {
      product,
      sentiment,
      topic,
      needs_reply,
      mismatch_only,
      broken_only,
      search,
    } = req.query;

    let reviewsList = Array.from(memoryReviewStore.values());

    const { isConnected } = getConnectionStatus();
    if (isConnected && reviewsList.length === 0) {
      try {
        reviewsList = await Review.find().sort({ createdAt: -1 }).lean();
      } catch (err) {
        console.warn('MongoDB query failed:', err.message);
      }
    }

    let filtered = reviewsList;

    if (product && product !== 'all') {
      filtered = filtered.filter((r) => r.product.toLowerCase() === product.toLowerCase());
    }

    if (sentiment && sentiment !== 'all') {
      filtered = filtered.filter((r) => r.sentiment?.toLowerCase() === sentiment.toLowerCase());
    }

    if (topic && topic !== 'all') {
      filtered = filtered.filter((r) => r.topics?.map((t) => t.toLowerCase()).includes(topic.toLowerCase()));
    }

    if (needs_reply === 'true') {
      filtered = filtered.filter((r) => r.needs_reply === true);
    }

    if (mismatch_only === 'true') {
      filtered = filtered.filter((r) => r.rating_mismatch === true);
    }

    if (broken_only === 'true') {
      filtered = filtered.filter((r) =>
        r.diagnostics?.badges?.some((b) => b.code !== 'CLEAN')
      );
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.original_text?.toLowerCase().includes(q) ||
          r.cleaned_text?.toLowerCase().includes(q) ||
          r.summary?.toLowerCase().includes(q) ||
          r.product?.toLowerCase().includes(q) ||
          r.review_id?.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      reviews: filtered,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reviews/summary
 */
export async function getSummary(req, res) {
  try {
    const reviewsList = Array.from(memoryReviewStore.values());
    const summary = computeSummaryMetrics(reviewsList);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reviews/products (Bonus Feature 2: Product View)
 */
export async function getProductInsights(req, res) {
  try {
    const reviewsList = Array.from(memoryReviewStore.values());
    const productMap = new Map();

    for (const r of reviewsList) {
      if (r.status === 'skipped_empty') continue;

      const prodName = r.product || 'General Product';
      if (!productMap.has(prodName)) {
        productMap.set(prodName, {
          product: prodName,
          totalReviews: 0,
          ratings: [],
          sentiment: { positive: 0, neutral: 0, negative: 0 },
          issues: [],
          praises: [],
        });
      }

      const pData = productMap.get(prodName);
      pData.totalReviews++;

      if (r.rating !== null) pData.ratings.push(r.rating);
      if (r.sentiment) pData.sentiment[r.sentiment] = (pData.sentiment[r.sentiment] || 0) + 1;

      if (r.sentiment === 'negative' && r.summary) {
        pData.issues.push({ review_id: r.review_id, issue: r.summary, topic: r.topics?.[0] || 'quality' });
      } else if (r.sentiment === 'positive' && r.summary) {
        pData.praises.push({ review_id: r.review_id, praise: r.summary });
      }
    }

    const result = Array.from(productMap.values()).map((p) => {
      const avgRating =
        p.ratings.length > 0
          ? Math.round((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length) * 10) / 10
          : null;

      const posPct = p.totalReviews > 0 ? Math.round((p.sentiment.positive / p.totalReviews) * 100) : 0;
      const neuPct = p.totalReviews > 0 ? Math.round((p.sentiment.neutral / p.totalReviews) * 100) : 0;
      const negPct = p.totalReviews > 0 ? Math.round((p.sentiment.negative / p.totalReviews) * 100) : 0;

      return {
        product: p.product,
        totalReviews: p.totalReviews,
        avgRating,
        sentimentSplit: {
          positive: posPct,
          neutral: neuPct,
          negative: negPct,
        },
        topIssues: p.issues.slice(0, 3),
        topPraises: p.praises.slice(0, 3),
      };
    });

    return res.status(200).json({
      success: true,
      products: result,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reviews/mismatches (Bonus Feature 1)
 */
export async function getMismatches(req, res) {
  try {
    const reviewsList = Array.from(memoryReviewStore.values());
    const mismatchData = detectRatingMismatches(reviewsList);
    return res.status(200).json({
      success: true,
      ...mismatchData,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reviews/telemetry (Bonus Feature 5)
 */
export async function getTelemetry(req, res) {
  try {
    const latestBatch = Array.from(memoryBatchStore.values()).pop();
    const stats = latestBatch?.stats || {};
    const telemetry = calculateTelemetry(stats);
    return res.status(200).json({
      success: true,
      telemetry,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/reviews/:id/suggest-reply (Core Requirement 7: On-Demand Reply)
 */
export async function suggestReply(req, res) {
  try {
    const { id } = req.params;
    let review = memoryReviewStore.get(id);

    const { isConnected } = getConnectionStatus();
    if (!review && isConnected) {
      review = await Review.findOne({ review_id: id }).lean();
    }

    if (!review) {
      return res.status(404).json({ error: `Review with ID "${id}" not found.` });
    }

    const { suggested_reply, provider } = await generateSuggestedReply(review);

    // Save suggested reply to store
    review.suggested_reply = suggested_reply;
    memoryReviewStore.set(id, review);

    if (isConnected) {
      Review.updateOne({ review_id: id }, { $set: { suggested_reply } }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      review_id: id,
      suggested_reply,
      provider,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
