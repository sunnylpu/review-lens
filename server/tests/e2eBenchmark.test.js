import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { parseCsvBuffer } from '../services/multiFormatParser.js';
import { cleanAndAuditReviewBatch } from '../services/cleanerService.js';
import { processReviewBatch } from '../services/batchService.js';
import { clearMemoryCache } from '../services/cacheService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CEDCOSS Assessment Benchmark & Verification Suite', () => {
  const sampleCsvPath = path.resolve(__dirname, '../../reviews.csv');
  let csvBuffer;

  beforeAll(() => {
    csvBuffer = fs.readFileSync(sampleCsvPath);
    clearMemoryCache();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('Benchmark 1: First Upload processes all 30 rows and caches analyses', async () => {
    const rawParsed = await parseCsvBuffer(csvBuffer);
    expect(rawParsed.length).toBe(30);

    const { reviews: cleaned, audit } = cleanAndAuditReviewBatch(rawParsed);
    expect(audit.totalRows).toBe(30);
    expect(audit.emptySkipped).toBe(1); // R005

    const { reviews: analyzed, stats } = await processReviewBatch(cleaned);

    expect(analyzed.length).toBe(30);
    expect(stats.aiCallsCount).toBeGreaterThanOrEqual(1);

    // Verify R005 is skipped
    const r005 = analyzed.find((r) => r.review_id === 'R005');
    expect(r005.status).toBe('skipped_empty');

    // Verify R012 Prompt Injection is neutralized
    const r012 = analyzed.find((r) => r.review_id === 'R012');
    expect(r012.sentiment).toBe('negative');
    expect(r012.topics).toContain('quality');
    expect(r012.needs_reply).toBe(true);

    // Verify R015 is recognized as duplicate of R012
    const r015 = analyzed.find((r) => r.review_id === 'R015');
    expect(r015.status).toBe('duplicate_reused');
    expect(r015.duplicate_of).toBe('R012');

    // Verify R008 is flagged as rating mismatch
    const r008 = analyzed.find((r) => r.review_id === 'R008');
    expect(r008.rating_mismatch).toBe(true);
  });

  test('Benchmark 2: Second Upload of identical file achieves 100% cache hits and 0 AI API calls (Core Requirement 6)', async () => {
    const rawParsed = await parseCsvBuffer(csvBuffer);
    const { reviews: cleaned } = cleanAndAuditReviewBatch(rawParsed);

    // Second processing run: everything should be served from cache!
    const { reviews: analyzed, stats } = await processReviewBatch(cleaned);

    expect(analyzed.length).toBe(30);
    expect(stats.aiCallsCount).toBe(0); // ZERO AI calls made!
    expect(stats.cacheHitsCount).toBe(29); // All 29 non-empty reviews served from cache!
    expect(stats.cacheHitRate).toBe(100);
    expect(stats.durationMs).toBeLessThan(150); // Instant execution under 150ms!
  });
});
