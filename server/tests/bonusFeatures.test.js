import {
  detectRatingMismatches,
  aggregateProductAnalytics,
  calculateTelemetry,
} from '../services/bonusService.js';
import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';

describe('Bonus Features Suite (Mismatch Engine, Product View & Cost Tracker)', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  const mockReviews = [
    {
      review_id: 'R001',
      product: 'Cotton Bedsheet Set',
      rating: 5,
      sentiment: 'positive',
      topics: ['quality'],
      summary: 'Super soft fabric.',
    },
    {
      review_id: 'R002',
      product: 'Cotton Bedsheet Set',
      rating: 2,
      sentiment: 'negative',
      topics: ['size_fit'],
      summary: 'Ordered king size, got queen.',
    },
    {
      review_id: 'R008',
      product: 'Ceramic Coffee Mug (Set of 2)',
      rating: 5, // 5 stars
      sentiment: 'negative', // but negative! Contradiction!
      topics: ['quality'],
      summary: 'Terrible. Both handles came off within a week.',
    },
    {
      review_id: 'R010',
      product: 'Ceramic Coffee Mug (Set of 2)',
      rating: null, // unrated
      sentiment: 'neutral',
      topics: ['price'],
      summary: 'Good quality but overpriced.',
    },
  ];

  test('1. detectRatingMismatches flags R008 (5 stars vs negative text) and computes agreement %', () => {
    const result = detectRatingMismatches(mockReviews);

    expect(result.ratedCount).toBe(3); // R001, R002, R008 (R010 is null)
    expect(result.mismatchedCount).toBe(1); // R008
    expect(result.mismatches[0].review_id).toBe('R008');
    expect(result.mismatches[0].reason).toContain('Inverted Rating');
    expect(result.agreementPercent).toBeCloseTo(66.7, 1);
  });

  test('2. aggregateProductAnalytics computes accurate SKU splits and top issues', () => {
    const products = aggregateProductAnalytics(mockReviews);

    expect(products.length).toBe(2); // Cotton Bedsheet Set & Ceramic Coffee Mug

    const bedsheet = products.find((p) => p.product === 'Cotton Bedsheet Set');
    expect(bedsheet.totalReviews).toBe(2);
    expect(bedsheet.avgRating).toBe(3.5);
    expect(bedsheet.sentimentSplit.positive).toBe(50);
    expect(bedsheet.sentimentSplit.negative).toBe(50);
    expect(bedsheet.topIssues.length).toBe(1);
    expect(bedsheet.topIssues[0].review_id).toBe('R002');

    const mug = products.find((p) => p.product === 'Ceramic Coffee Mug (Set of 2)');
    expect(mug.totalReviews).toBe(2);
    expect(mug.sentimentSplit.negative).toBe(50);
    expect(mug.sentimentSplit.neutral).toBe(50);
  });

  test('3. calculateTelemetry accurately computes cache hit rate and token savings', () => {
    const stats = {
      durationMs: 1250,
      aiCallsCount: 20,
      cacheHitsCount: 10,
    };

    const telemetry = calculateTelemetry(stats);

    expect(telemetry.durationMs).toBe(1250);
    expect(telemetry.aiCallsCount).toBe(20);
    expect(telemetry.cacheHitsCount).toBe(10);
    expect(telemetry.cacheHitRate).toBe(33); // 10 / 30 = 33%
    expect(telemetry.estimatedTokensSaved).toBe(3500); // 10 * 350
  });

  test('4. GET /api/reviews/mismatches returns live mismatch detection payload', async () => {
    const res = await request(app).get('/api/reviews/mismatches');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.agreementPercent).toBeDefined();
    expect(Array.isArray(res.body.mismatches)).toBe(true);
  });

  test('5. GET /api/reviews/telemetry returns runtime cost metrics', async () => {
    const res = await request(app).get('/api/reviews/telemetry');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.telemetry).toBeDefined();
  });
});
