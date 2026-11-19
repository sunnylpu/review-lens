/**
 * Bonus Features Service Engine
 * 1. Rating Mismatch Detector & Agreement % (Bonus Feature 1)
 * 2. Product-Level Deep Dive & Topic Distribution (Bonus Feature 2)
 * 3. Performance, Cost & Cache Savings Logger (Bonus Feature 5)
 */

/**
 * 1. Rating Mismatch Detection & Agreement Calculation
 * Flags reviews where star rating contradicts AI sentiment (e.g. R008: 5★ with negative text)
 */
export function detectRatingMismatches(reviews = []) {
  let ratedCount = 0;
  let consistentCount = 0;
  const mismatchedReviews = [];

  for (const r of reviews) {
    if (r.status === 'skipped_empty' || r.rating === null || !r.sentiment) continue;

    ratedCount++;
    const rating = r.rating;
    const sentiment = r.sentiment;

    let isMismatch = false;
    let reason = null;

    if (rating >= 4 && sentiment === 'negative') {
      isMismatch = true;
      reason = `Inverted Rating: Customer awarded ${rating} stars, but feedback was classified as Negative ("${r.summary || r.cleaned_text}").`;
    } else if (rating <= 2 && sentiment === 'positive') {
      isMismatch = true;
      reason = `Inverted Rating: Customer awarded ${rating} stars, but feedback was classified as Positive ("${r.summary || r.cleaned_text}").`;
    }

    if (isMismatch) {
      mismatchedReviews.push({
        review_id: r.review_id,
        product: r.product,
        rating,
        sentiment,
        reason,
        summary: r.summary,
      });
    } else {
      consistentCount++;
    }
  }

  const agreementPercent =
    ratedCount > 0 ? Math.round((consistentCount / ratedCount) * 1000) / 10 : 100;

  return {
    agreementPercent,
    ratedCount,
    consistentCount,
    mismatchedCount: mismatchedReviews.length,
    mismatches: mismatchedReviews,
  };
}

/**
 * 2. Product-Level Analytics Aggregator
 * Computes SKU-level sentiment splits, average ratings, and top friction issues
 */
export function aggregateProductAnalytics(reviews = []) {
  const productMap = new Map();

  for (const r of reviews) {
    if (r.status === 'skipped_empty') continue;

    const prod = r.product || 'General Product';
    if (!productMap.has(prod)) {
      productMap.set(prod, {
        product: prod,
        totalReviews: 0,
        ratings: [],
        sentiments: { positive: 0, neutral: 0, negative: 0 },
        topicCounts: {},
        complaints: [],
        praises: [],
      });
    }

    const data = productMap.get(prod);
    data.totalReviews++;

    if (r.rating !== null) data.ratings.push(r.rating);
    if (r.sentiment) data.sentiments[r.sentiment] = (data.sentiments[r.sentiment] || 0) + 1;

    // Track topics
    if (Array.isArray(r.topics)) {
      for (const t of r.topics) {
        data.topicCounts[t] = (data.topicCounts[t] || 0) + 1;
      }
    }

    if (r.sentiment === 'negative' && r.summary) {
      data.complaints.push({
        review_id: r.review_id,
        issue: r.summary,
        topic: r.topics?.[0] || 'quality',
      });
    } else if (r.sentiment === 'positive' && r.summary) {
      data.praises.push({
        review_id: r.review_id,
        praise: r.summary,
        topic: r.topics?.[0] || 'quality',
      });
    }
  }

  return Array.from(productMap.values()).map((p) => {
    const avgRating =
      p.ratings.length > 0
        ? Math.round((p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length) * 10) / 10
        : null;

    const pos = p.totalReviews > 0 ? Math.round((p.sentiments.positive / p.totalReviews) * 100) : 0;
    const neu = p.totalReviews > 0 ? Math.round((p.sentiments.neutral / p.totalReviews) * 100) : 0;
    const neg = p.totalReviews > 0 ? Math.round((p.sentiments.negative / p.totalReviews) * 100) : 0;

    // Identify primary topic friction
    const sortedTopics = Object.entries(p.topicCounts).sort((a, b) => b[1] - a[1]);
    const topTopic = sortedTopics[0]?.[0] || 'quality';

    return {
      product: p.product,
      totalReviews: p.totalReviews,
      avgRating,
      sentimentSplit: {
        positive: pos,
        neutral: neu,
        negative: neg,
      },
      primaryTopic: topTopic,
      topIssues: p.complaints.slice(0, 3),
      topPraises: p.praises.slice(0, 3),
    };
  });
}

/**
 * 3. Cost & Speed Telemetry Engine
 * Computes estimated token savings and execution metrics
 */
export function calculateTelemetry(stats = {}) {
  const { durationMs = 0, aiCallsCount = 0, cacheHitsCount = 0 } = stats;
  const total = aiCallsCount + cacheHitsCount;
  const cacheHitRate = total > 0 ? Math.round((cacheHitsCount / total) * 100) : 0;

  // Average prompt + completion tokens ~ 350 tokens per review
  const estimatedTokensSaved = cacheHitsCount * 350;

  return {
    durationMs,
    aiCallsCount,
    cacheHitsCount,
    cacheHitRate,
    estimatedTokensSaved,
    efficiencyRating: cacheHitRate > 50 ? 'HIGH_EFFICIENCY' : 'NORMAL',
  };
}
