import express from 'express';
import multer from 'multer';
import {
  uploadReviews,
  getReviews,
  getSummary,
  getProductInsights,
  getMismatches,
  getTelemetry,
  suggestReply,
} from '../controllers/reviewController.js';

const router = express.Router();

// Configure Multer for in-memory uploads (up to 15MB)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Routes
router.post('/upload', upload.single('file'), uploadReviews);
router.get('/', getReviews);
router.get('/summary', getSummary);
router.get('/products', getProductInsights);
router.get('/mismatches', getMismatches);
router.get('/telemetry', getTelemetry);
router.post('/:id/suggest-reply', suggestReply);

export default router;
