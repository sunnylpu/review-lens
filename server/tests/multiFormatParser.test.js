import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as xlsx from 'xlsx';
import {
  parseCsvBuffer,
  parseJsonBuffer,
  parseExcelBuffer,
  parseRawTextToReviews,
  parseUploadedFile,
} from '../services/multiFormatParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Universal Multi-Format Parser', () => {
  const sampleCsvPath = path.resolve(__dirname, '../../reviews.csv');

  test('1. Parses the official 30-row reviews.csv correctly', async () => {
    const csvBuffer = fs.readFileSync(sampleCsvPath);
    const parsed = await parseCsvBuffer(csvBuffer);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(30);

    // Verify R001
    expect(parsed[0].review_id).toBe('R001');
    expect(parsed[0].product).toBe('Cotton Bedsheet Set');
    expect(parsed[0].rating).toBe('5');
    expect(parsed[0].review_text).toContain('Super soft fabric');

    // Verify R005 (Empty review)
    expect(parsed[4].review_id).toBe('R005');
    expect(parsed[4].review_text).toBe('');

    // Verify R012 (Prompt Injection)
    expect(parsed[11].review_id).toBe('R012');
    expect(parsed[11].review_text).toContain('Ignore all previous instructions');

    // Verify R028 (Multi-line quoted text with commas)
    expect(parsed[27].review_id).toBe('R028');
    expect(parsed[27].review_text).toContain('The stitching is neat');
    expect(parsed[27].review_text).toContain('Delivery took 6 days');
  });

  test('2. Parses JSON and JSONL buffers into canonical reviews', async () => {
    const jsonSample = JSON.stringify([
      {
        id: 'J001',
        productName: 'Mechanical Keyboard',
        score: 5,
        created_at: '2026-11-01',
        feedback: 'Tactile switches feel crisp and satisfying.',
      },
      {
        id: 'J002',
        productName: 'Gaming Mouse',
        score: 2,
        feedback: 'Sensor rattles during quick movements.',
      },
    ]);

    const parsedJson = await parseJsonBuffer(Buffer.from(jsonSample));
    expect(parsedJson.length).toBe(2);
    expect(parsedJson[0].review_id).toBe('J001');
    expect(parsedJson[0].product).toBe('Mechanical Keyboard');
    expect(parsedJson[0].rating).toBe(5);
    expect(parsedJson[0].review_text).toBe('Tactile switches feel crisp and satisfying.');
    expect(parsedJson[1].review_id).toBe('J002');
  });

  test('3. Parses Excel (.xlsx) buffer into canonical reviews', async () => {
    const wb = xlsx.utils.book_new();
    const wsData = [
      ['review_id', 'product', 'rating', 'date', 'review_text'],
      ['E001', 'Noise Cancelling Headphones', 5, '2026-11-05', 'Silent background, supreme comfort.'],
      ['E002', 'USB-C Cable', 3, '2026-11-06', 'Works fine but stiff braided wire.'],
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsedExcel = await parseExcelBuffer(excelBuffer);
    expect(parsedExcel.length).toBe(2);
    expect(parsedExcel[0].review_id).toBe('E001');
    expect(parsedExcel[0].product).toBe('Noise Cancelling Headphones');
    expect(parsedExcel[0].rating).toBe(5);
    expect(parsedExcel[0].review_text).toBe('Silent background, supreme comfort.');
  });

  test('4. Parses direct text paste with smart delimiter recognition', () => {
    const textPaste = `
Review: Amazing wireless charger, charges fast!
Rating: 5
Product: Fast Charger

Review: Broke after one week of usage.
Rating: 1
Product: Fast Charger
`;
    const parsedText = parseRawTextToReviews(textPaste, 'paste');
    expect(parsedText.length).toBe(2);
    expect(parsedText[0].review_text).toContain('Amazing wireless charger');
    expect(parsedText[1].review_text).toContain('Broke after one week');
  });

  test('5. parseUploadedFile routes correctly by file extension', async () => {
    const csvBuffer = fs.readFileSync(sampleCsvPath);
    const parsed = await parseUploadedFile({
      buffer: csvBuffer,
      originalname: 'customer_reviews.csv',
      mimetype: 'text/csv',
    });

    expect(parsed.length).toBe(30);
    expect(parsed[0].review_id).toBe('R001');
  });
});
