import csv from 'csv-parser';
import { Readable } from 'stream';
import * as xlsx from 'xlsx';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Universal Multi-Format Review Parser
 * Supports: CSV, Excel (.xlsx/.xls), PDF, Word (.docx), JSON/JSONL, and Raw Text Paste.
 * Converts any format into a standardized CanonicalReview array.
 */

// Common header alias mappings for flexible schema matching
const HEADER_ALIASES = {
  review_id: ['review_id', 'id', 'reviewid', 'review_no', 'reviewId', 'ID'],
  product: ['product', 'product_name', 'item', 'productname', 'productName', 'item_name', 'title'],
  rating: ['rating', 'stars', 'score', 'star_rating', 'starRating', 'ratings'],
  date: ['date', 'review_date', 'created_at', 'timestamp', 'reviewDate', 'createdAt'],
  review_text: ['review_text', 'review', 'text', 'feedback', 'content', 'comments', 'body', 'reviewText', 'comment'],
};

/**
 * Maps arbitrary object keys to canonical keys based on alias dictionary
 */
export function mapRowToCanonical(rawRow, index = 0, source = 'csv') {
  if (!rawRow || typeof rawRow !== 'object') {
    return null;
  }

  const normalizedKeys = {};
  for (const [key, value] of Object.entries(rawRow)) {
    normalizedKeys[key.trim().toLowerCase()] = value;
  }

  const findValue = (aliases) => {
    for (const alias of aliases) {
      const lowerAlias = alias.toLowerCase();
      if (normalizedKeys[lowerAlias] !== undefined) {
        return normalizedKeys[lowerAlias];
      }
    }
    return undefined;
  };

  const rawId = findValue(HEADER_ALIASES.review_id);
  const rawProduct = findValue(HEADER_ALIASES.product);
  const rawRating = findValue(HEADER_ALIASES.rating);
  const rawDate = findValue(HEADER_ALIASES.date);
  const rawText = findValue(HEADER_ALIASES.review_text);

  const review_id = rawId !== undefined && String(rawId).trim() !== ''
    ? String(rawId).trim()
    : `R${String(index + 1).padStart(3, '0')}`;

  const product = rawProduct !== undefined && String(rawProduct).trim() !== ''
    ? String(rawProduct).trim()
    : 'General Product';

  const date = rawDate !== undefined && String(rawDate).trim() !== ''
    ? String(rawDate).trim()
    : new Date().toISOString().split('T')[0];

  const review_text = rawText !== undefined ? String(rawText) : '';

  return {
    review_id,
    product,
    rating: rawRating !== undefined ? rawRating : null,
    date,
    review_text,
    raw_source: source,
  };
}

/**
 * 1. CSV Stream Parser (RFC 4180 compliant)
 * Handles multi-line quoted fields, commas inside text, and empty values.
 */
export async function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    let rowIndex = 0;

    const stream = Readable.from(buffer.toString('utf-8'));

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim(),
          skipEmptyLines: false, // Keep empty rows so we can track and diagnose them!
        })
      )
      .on('data', (data) => {
        const canonical = mapRowToCanonical(data, rowIndex++, 'csv');
        if (canonical) {
          results.push(canonical);
        }
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(new Error(`CSV parsing failed: ${err.message}`)));
  });
}

/**
 * 2. Excel Parser (.xlsx, .xls)
 */
export async function parseExcelBuffer(buffer) {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    return rawRows.map((row, index) => mapRowToCanonical(row, index, 'xlsx')).filter(Boolean);
  } catch (err) {
    throw new Error(`Excel parsing failed: ${err.message}`);
  }
}

/**
 * 3. JSON / JSONL Parser
 */
export async function parseJsonBuffer(buffer) {
  const content = buffer.toString('utf-8').trim();
  if (!content) return [];

  // Try standard JSON first
  try {
    const parsed = JSON.parse(content);
    const arrayData = Array.isArray(parsed) ? parsed : (parsed.reviews || [parsed]);
    return arrayData.map((row, index) => mapRowToCanonical(row, index, 'json')).filter(Boolean);
  } catch {
    // If standard JSON fails, attempt JSON Lines (JSONL)
    try {
      const lines = content.split('\n').filter((line) => line.trim().length > 0);
      const results = [];
      for (let i = 0; i < lines.length; i++) {
        const row = JSON.parse(lines[i]);
        const canonical = mapRowToCanonical(row, i, 'json');
        if (canonical) results.push(canonical);
      }
      return results;
    } catch (jsonlErr) {
      throw new Error(`JSON / JSONL parsing failed: ${jsonlErr.message}`);
    }
  }
}

/**
 * 4. PDF Document Parser
 * Extracts text and intelligently parses structured review blocks or tabular data.
 */
export async function parsePdfBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = data.text || '';
    return parseRawTextToReviews(text, 'pdf');
  } catch (err) {
    throw new Error(`PDF parsing failed: ${err.message}`);
  }
}

/**
 * 5. Word Document Parser (.docx)
 */
export async function parseDocxBuffer(buffer) {
  try {
    const { value: text } = await mammoth.extractRawText({ buffer });
    return parseRawTextToReviews(text, 'docx');
  } catch (err) {
    throw new Error(`DOCX parsing failed: ${err.message}`);
  }
}

/**
 * 6. Smart Text / Paste Parser
 * Converts raw unstructured or semi-structured text into canonical reviews.
 */
export function parseRawTextToReviews(text, source = 'paste') {
  if (!text || typeof text !== 'string') return [];

  const trimmed = text.trim();
  if (!trimmed) return [];

  // Check if text is formatted as CSV (contains commas and multiple lines)
  const firstLine = trimmed.split('\n')[0];
  if (firstLine.includes(',') && (firstLine.includes('product') || firstLine.includes('rating') || firstLine.includes('review'))) {
    // Attempt fast CSV parse of text
    const lines = trimmed.split('\n');
    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting with quote awareness
      const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] ? parts[idx].replace(/^["']|["']$/g, '').trim() : '';
      });

      const canonical = mapRowToCanonical(row, i - 1, source);
      if (canonical) results.push(canonical);
    }

    if (results.length > 0) return results;
  }

  // Check for Block Pattern (e.g., Review ID: ..., Rating: ..., Text: ...)
  const blockRegex = /(?:Review ID|ID|Review):\s*([^\n]+)?/i;
  if (blockRegex.test(trimmed)) {
    const blocks = trimmed.split(/\n\s*\n+/);
    const results = [];
    let idx = 0;

    for (const block of blocks) {
      if (!block.trim()) continue;
      const lines = block.split('\n');
      const row = {};
      let currentKey = 'review_text';

      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 20) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line.slice(colonIdx + 1).trim();
          row[key] = val;
          currentKey = key;
        } else if (currentKey === 'review_text') {
          row.review_text = (row.review_text ? row.review_text + ' ' : '') + line.trim();
        }
      }

      const canonical = mapRowToCanonical(row, idx++, source);
      if (canonical && canonical.review_text) results.push(canonical);
    }

    if (results.length > 0) return results;
  }

  // Fallback: Paragraph or line-by-line review separation
  const paragraphs = trimmed.split(/\n\s*\n+/).filter((p) => p.trim().length > 0);
  return paragraphs.map((para, index) => {
    // Look for star rating if written like "5 stars", "4/5", or "⭐"
    let rating = null;
    const starMatch = para.match(/(\d)\s*(?:stars?|\/5|\*)/i);
    if (starMatch) {
      rating = parseInt(starMatch[1], 10);
    } else {
      const emojiStars = (para.match(/⭐/g) || []).length;
      if (emojiStars > 0 && emojiStars <= 5) rating = emojiStars;
    }

    return {
      review_id: `P${String(index + 1).padStart(3, '0')}`,
      product: 'General Product',
      rating,
      date: new Date().toISOString().split('T')[0],
      review_text: para.trim(),
      raw_source: source,
    };
  });
}

/**
 * Universal Entrypoint: Parses any uploaded file based on MIME type or filename extension.
 */
export async function parseUploadedFile({ buffer, originalname, mimetype, text }) {
  // If direct text is provided
  if (text && typeof text === 'string') {
    return parseRawTextToReviews(text, 'paste');
  }

  if (!buffer) {
    throw new Error('No file buffer or text content provided for parsing');
  }

  const filename = (originalname || '').toLowerCase();
  const mime = (mimetype || '').toLowerCase();

  if (filename.endsWith('.csv') || mime.includes('csv') || mime.includes('text/plain')) {
    return parseCsvBuffer(buffer);
  }

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls') || mime.includes('spreadsheet') || mime.includes('excel')) {
    return parseExcelBuffer(buffer);
  }

  if (filename.endsWith('.pdf') || mime.includes('pdf')) {
    return parsePdfBuffer(buffer);
  }

  if (filename.endsWith('.docx') || mime.includes('wordprocessingml') || mime.includes('officedocument')) {
    return parseDocxBuffer(buffer);
  }

  if (filename.endsWith('.json') || filename.endsWith('.jsonl') || mime.includes('json')) {
    return parseJsonBuffer(buffer);
  }

  // Fallback to text parsing
  return parseRawTextToReviews(buffer.toString('utf-8'), 'paste');
}
