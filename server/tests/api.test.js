import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import app from '../index.js';
import { clearMemoryCache } from '../services/cacheService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ReviewLens REST API Endpoints', () => {
  const sampleCsvPath = path.resolve(__dirname, '../../reviews.csv');

  beforeAll(() => {
    clearMemoryCache();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('1. GET /api/health returns 200 and system status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.app).toBe('ReviewLens API');
  });

  test('2. POST /api/reviews/upload ingests and analyzes reviews.csv', async () => {
    const res = await request(app)
      .post('/api/reviews/upload')
      .attach('file', sampleCsvPath);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.batchId).toBeDefined();

    // Summary validation (Core Requirement 7)
    const { summary, reviews } = res.body;
    expect(summary.totalReviews).toBe(30);
    expect(summary.validReviewsCount).toBe(29);
    expect(summary.emptySkippedCount).toBe(1);

    // Sentiment breakdown
    expect(summary.sentiment.positive.percentage).toBeGreaterThan(0);
    expect(summary.sentiment.negative.percentage).toBeGreaterThan(0);

    // Top 3 Insights (Core Requirement 7)
    expect(summary.topInsights.topComplaints.length).toBeLessThanOrEqual(3);
    expect(summary.topInsights.topPraises.length).toBeLessThanOrEqual(3);

    // Rating Mismatch (Bonus Feature 1)
    expect(summary.ratingAgreement.mismatchedCount).toBeGreaterThanOrEqual(1);

    // Reviews list
    expect(reviews.length).toBe(30);
  });

  test('3. GET /api/reviews filters by sentiment and product', async () => {
    const res = await request(app).get('/api/reviews?sentiment=negative');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reviews.every((r) => r.sentiment === 'negative')).toBe(true);

    const productRes = await request(app).get('/api/reviews?product=Wireless Earbuds X2');
    expect(productRes.status).toBe(200);
    expect(productRes.body.reviews.every((r) => r.product === 'Wireless Earbuds X2')).toBe(true);
  });

  test('4. GET /api/reviews/products returns product-level sentiment splits (Bonus 2)', async () => {
    const res = await request(app).get('/api/reviews/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);

    const firstProd = res.body.products[0];
    expect(firstProd.product).toBeDefined();
    expect(firstProd.sentimentSplit).toBeDefined();
    expect(firstProd.sentimentSplit.positive).toBeDefined();
  });

  test('5. POST /api/reviews/:id/suggest-reply generates on-demand reply (Core Requirement 7)', async () => {
    const res = await request(app).post('/api/reviews/R007/suggest-reply');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.review_id).toBe('R007');
    expect(res.body.suggested_reply).toBeDefined();
    expect(res.body.suggested_reply.length).toBeGreaterThan(15);
  });
});
