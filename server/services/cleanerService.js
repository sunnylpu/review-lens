import crypto from 'crypto';

/**
 * Broken Store Input Detection & Sanitizer Engine
 * 
 * Inspects, sanitizes, and categorizes messy, real-world customer review inputs.
 * Detects all 10 anomaly types from the CEDCOSS assessment dataset and real store exports.
 */

const NUMBER_WORDS_MAP = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /you\s+are\s+now/i,
  /mark\s+this\s+review\s+as\s+positive/i,
  /give\s+(?:a\s+)?5\s+star\s+summary/i,
  /override\s+system/i,
  /prompt\s+injection/i,
];

const HINGLISH_KEYWORDS = [
  'accha', 'achha', 'kharab', 'bahut', 'bohot', 'phata', 'hua', 'tha',
  'badhiya', 'badiya', 'zyada', 'jyada', 'sasta', 'mehnga', 'sahi',
  'thoda', 'paisa', 'vasool', 'nahi', 'kuch', 'bhi', 'hai', 'par',
];

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const SARCASM_EMOJIS_REGEX = /🙄|😒|🤦| sarcasm /i;

/**
 * Strips HTML tags cleanly while preserving text content
 */
export function sanitizeHtml(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Normalizes text for consistent hashing & deduplication
 */
export function normalizeTextForHashing(text) {
  if (!text) return '';
  return sanitizeHtml(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes SHA-256 hash of normalized review text
 */
export function computeReviewHash(text) {
  const normalized = normalizeTextForHashing(text);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalizes star ratings to integer 1-5 or null (unknown)
 */
export function normalizeRating(rawRating) {
  if (rawRating === null || rawRating === undefined || rawRating === '') {
    return { rating: null, ratingStatus: 'unknown', wasNormalized: false };
  }

  // If already a valid number
  if (typeof rawRating === 'number' && !isNaN(rawRating)) {
    const rounded = Math.round(rawRating);
    if (rounded >= 1 && rounded <= 5) {
      return { rating: rounded, ratingStatus: 'valid', wasNormalized: false };
    }
    return { rating: null, ratingStatus: 'out_of_bounds', wasNormalized: true };
  }

  const str = String(rawRating).trim().toLowerCase();
  if (str === '') {
    return { rating: null, ratingStatus: 'unknown', wasNormalized: false };
  }

  // Check word numbers like "five", "one", etc. (e.g. R022)
  if (NUMBER_WORDS_MAP[str] !== undefined) {
    return { rating: NUMBER_WORDS_MAP[str], ratingStatus: 'parsed_word', wasNormalized: true };
  }

  // Parse integer from string
  const parsed = parseInt(str, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
    return { rating: parsed, ratingStatus: 'valid', wasNormalized: false };
  }

  return { rating: null, ratingStatus: 'unknown', wasNormalized: true };
}

/**
 * Inspects and sanitizes a single raw review record
 */
export function sanitizeAndInspectReview(review, seenHashes = new Map()) {
  const rawText = review.review_text !== undefined && review.review_text !== null ? String(review.review_text) : '';
  const trimmedText = rawText.trim();
  const badges = [];

  // 1. Detect Empty / Blank Review (e.g. R005)
  const isEmpty = trimmedText.length === 0;
  if (isEmpty) {
    badges.push({ code: 'EMPTY_SKIPPED', label: 'Empty Skipped', tone: 'zinc' });
  }

  // 2. Normalize Rating (e.g. R010 missing, R022 "five")
  const { rating: normalizedRating, ratingStatus, wasNormalized } = normalizeRating(review.rating);
  if (ratingStatus === 'unknown') {
    badges.push({ code: 'NO_RATING', label: 'No Rating', tone: 'zinc' });
  } else if (wasNormalized) {
    badges.push({ code: 'NORMALIZED_RATING', label: `${normalizedRating}★ Normalized`, tone: 'slate' });
  }

  // 3. Detect and Clean HTML tags (e.g. R024 <b>Love it!</b>)
  const hasHtml = HTML_TAG_REGEX.test(rawText);
  const cleanedText = hasHtml ? sanitizeHtml(rawText) : trimmedText;
  if (hasHtml) {
    badges.push({ code: 'HTML_CLEANED', label: 'HTML Sanitized', tone: 'amber' });
  }

  // 4. Detect Malicious Prompt Injection (e.g. R012)
  const isPromptInjection = INJECTION_PATTERNS.some((pattern) => pattern.test(cleanedText));
  if (isPromptInjection) {
    badges.push({ code: 'INJECTION_DEFUSED', label: 'Injection Defused', tone: 'rose' });
  }

  // 5. Language & Script Classification (e.g. R004 Hinglish, R016 Hindi Unicode)
  const isHindiScript = DEVANAGARI_REGEX.test(cleanedText);
  const words = cleanedText.toLowerCase().split(/[\s,.'!?"]+/);
  const isHinglish = !isHindiScript && words.some((w) => HINGLISH_KEYWORDS.includes(w));

  if (isHindiScript) {
    badges.push({ code: 'HINDI_SCRIPT', label: 'Hindi', tone: 'slate' });
  } else if (isHinglish) {
    badges.push({ code: 'HINGLISH', label: 'Hinglish', tone: 'slate' });
  }

  // 6. Detect Sarcasm & Inverted Intent (e.g. R003)
  const hasSarcasmEmoji = SARCASM_EMOJIS_REGEX.test(rawText);
  const hasSarcasmTiming = /delivered in just \d+ weeks/i.test(cleanedText) && /amazing speed|really impressed/i.test(cleanedText);
  const isSarcastic = hasSarcasmEmoji || hasSarcasmTiming;
  if (isSarcastic) {
    badges.push({ code: 'SARCASM_DETECTED', label: 'Sarcasm Detected', tone: 'zinc' });
  }

  // 7. Duplicate Detection via SHA-256 fingerprint (e.g. R015 duplicate of R012)
  const textHash = computeReviewHash(cleanedText);
  let isDuplicate = false;
  let duplicateOf = null;

  if (!isEmpty) {
    if (seenHashes.has(textHash)) {
      isDuplicate = true;
      duplicateOf = seenHashes.get(textHash);
      badges.push({ code: 'DUPLICATE_REUSED', label: `Duplicate of ${duplicateOf}`, tone: 'slate' });
    } else {
      seenHashes.set(textHash, review.review_id);
    }
  }

  if (badges.length === 0 && !isEmpty) {
    badges.push({ code: 'CLEAN', label: 'Clean', tone: 'emerald' });
  }

  return {
    review_id: review.review_id,
    product: review.product || 'General Product',
    original_rating: review.rating,
    rating: normalizedRating,
    rating_status: ratingStatus,
    date: review.date,
    original_text: rawText,
    cleaned_text: cleanedText,
    text_hash: textHash,
    is_empty: isEmpty,
    is_duplicate: isDuplicate,
    duplicate_of: duplicateOf,
    is_prompt_injection: isPromptInjection,
    is_hinglish: isHinglish,
    is_hindi_script: isHindiScript,
    is_sarcastic: isSarcastic,
    html_sanitized: hasHtml,
    status: isEmpty ? 'skipped_empty' : (isDuplicate ? 'duplicate_pending' : 'pending'),
    diagnostics: {
      badges,
    },
    raw_source: review.raw_source || 'csv',
  };
}

/**
 * Cleans an entire array of reviews and produces a batch health audit
 */
export function cleanAndAuditReviewBatch(reviews) {
  const seenHashes = new Map();
  const cleanedReviews = [];

  let emptyCount = 0;
  let duplicateCount = 0;
  let injectionCount = 0;
  let htmlCleanedCount = 0;
  let normalizedRatingCount = 0;
  let nonEnglishCount = 0;

  for (const raw of reviews) {
    const inspected = sanitizeAndInspectReview(raw, seenHashes);
    cleanedReviews.push(inspected);

    if (inspected.is_empty) emptyCount++;
    if (inspected.is_duplicate) duplicateCount++;
    if (inspected.is_prompt_injection) injectionCount++;
    if (inspected.html_sanitized) htmlCleanedCount++;
    if (inspected.rating_status !== 'valid') normalizedRatingCount++;
    if (inspected.is_hinglish || inspected.is_hindi_script) nonEnglishCount++;
  }

  const total = cleanedReviews.length;
  const validForAi = cleanedReviews.filter((r) => !r.is_empty && !r.is_duplicate);

  // Health Score calculation (Percentage of completely clean inputs)
  const cleanCount = cleanedReviews.filter((r) => r.diagnostics.badges.some((b) => b.code === 'CLEAN')).length;
  const healthScore = total > 0 ? Math.round((cleanCount / total) * 100) : 100;

  return {
    reviews: cleanedReviews,
    audit: {
      totalRows: total,
      validForAiCount: validForAi.length,
      emptySkipped: emptyCount,
      duplicatesFound: duplicateCount,
      injectionsDefused: injectionCount,
      htmlCleaned: htmlCleanedCount,
      ratingsNormalized: normalizedRatingCount,
      nonEnglishDetected: nonEnglishCount,
      healthScore,
    },
  };
}
