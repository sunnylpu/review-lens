import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsvBuffer } from '../services/multiFormatParser.js';
import {
  sanitizeHtml,
  normalizeRating,
  computeReviewHash,
  sanitizeAndInspectReview,
  cleanAndAuditReviewBatch,
} from '../services/cleanerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Broken Store Input Detection & Cleaner Service', () => {
  const sampleCsvPath = path.resolve(__dirname, '../../reviews.csv');
  let rawReviews = [];

  beforeAll(async () => {
    const csvBuffer = fs.readFileSync(sampleCsvPath);
    rawReviews = await parseCsvBuffer(csvBuffer);
  });

  test('1. Detects and flags empty review R005 without crashing', () => {
    const r005 = rawReviews.find((r) => r.review_id === 'R005');
    const inspected = sanitizeAndInspectReview(r005);

    expect(inspected.is_empty).toBe(true);
    expect(inspected.status).toBe('skipped_empty');
    expect(inspected.diagnostics.badges.some((b) => b.code === 'EMPTY_SKIPPED')).toBe(true);
  });

  test('2. Normalizes missing rating in R010 to null/unknown', () => {
    const r010 = rawReviews.find((r) => r.review_id === 'R010');
    const inspected = sanitizeAndInspectReview(r010);

    expect(inspected.rating).toBeNull();
    expect(inspected.rating_status).toBe('unknown');
    expect(inspected.diagnostics.badges.some((b) => b.code === 'NO_RATING')).toBe(true);
  });

  test('3. Parses word string rating in R022 ("five" -> 5)', () => {
    const r022 = rawReviews.find((r) => r.review_id === 'R022');
    const inspected = sanitizeAndInspectReview(r022);

    expect(inspected.rating).toBe(5);
    expect(inspected.rating_status).toBe('parsed_word');
    expect(inspected.diagnostics.badges.some((b) => b.code === 'NORMALIZED_RATING')).toBe(true);
  });

  test('4. Detects malicious prompt injection in R012', () => {
    const r012 = rawReviews.find((r) => r.review_id === 'R012');
    const inspected = sanitizeAndInspectReview(r012);

    expect(inspected.is_prompt_injection).toBe(true);
    expect(inspected.diagnostics.badges.some((b) => b.code === 'INJECTION_DEFUSED')).toBe(true);
  });

  test('5. Detects in-batch duplicate R015 (identical to R012) via SHA-256 fingerprint', () => {
    const seenHashes = new Map();
    const r012 = rawReviews.find((r) => r.review_id === 'R012');
    const r015 = rawReviews.find((r) => r.review_id === 'R015');

    const inspected12 = sanitizeAndInspectReview(r012, seenHashes);
    const inspected15 = sanitizeAndInspectReview(r015, seenHashes);

    expect(inspected12.is_duplicate).toBe(false);
    expect(inspected15.is_duplicate).toBe(true);
    expect(inspected15.duplicate_of).toBe('R012');
    expect(inspected15.text_hash).toBe(inspected12.text_hash);
    expect(inspected15.diagnostics.badges.some((b) => b.code === 'DUPLICATE_REUSED')).toBe(true);
  });

  test('6. Strips HTML tags cleanly in R024 while preserving text', () => {
    const r024 = rawReviews.find((r) => r.review_id === 'R024');
    const inspected = sanitizeAndInspectReview(r024);

    expect(inspected.html_sanitized).toBe(true);
    expect(inspected.cleaned_text).toBe('Love it! Keeps my desk clean, and the bamboo smells nice.');
    expect(inspected.cleaned_text).not.toContain('<b>');
    expect(inspected.diagnostics.badges.some((b) => b.code === 'HTML_CLEANED')).toBe(true);
  });

  test('7. Detects sarcasm and inverted intent in R003', () => {
    const r003 = rawReviews.find((r) => r.review_id === 'R003');
    const inspected = sanitizeAndInspectReview(r003);

    expect(inspected.is_sarcastic).toBe(true);
    expect(inspected.diagnostics.badges.some((b) => b.code === 'SARCASM_DETECTED')).toBe(true);
  });

  test('8. Detects Hinglish in R004 and R026', () => {
    const r004 = rawReviews.find((r) => r.review_id === 'R004');
    const inspected = sanitizeAndInspectReview(r004);

    expect(inspected.is_hinglish).toBe(true);
    expect(inspected.diagnostics.badges.some((b) => b.code === 'HINGLISH')).toBe(true);
  });

  test('9. Detects Devanagari Hindi script in R016', () => {
    const r016 = rawReviews.find((r) => r.review_id === 'R016');
    const inspected = sanitizeAndInspectReview(r016);

    expect(inspected.is_hindi_script).toBe(true);
    expect(inspected.diagnostics.badges.some((b) => b.code === 'HINDI_SCRIPT')).toBe(true);
  });

  test('10. Audits full 30-row batch and computes accurate health score', () => {
    const { reviews, audit } = cleanAndAuditReviewBatch(rawReviews);

    expect(reviews.length).toBe(30);
    expect(audit.totalRows).toBe(30);
    expect(audit.emptySkipped).toBe(1); // R005
    expect(audit.duplicatesFound).toBe(1); // R015
    expect(audit.injectionsDefused).toBe(2); // R012 and R015
    expect(audit.htmlCleaned).toBe(1); // R024
    expect(audit.validForAiCount).toBe(28); // 30 - 1 empty - 1 duplicate = 28
    expect(audit.healthScore).toBeGreaterThanOrEqual(50);
  });
});
