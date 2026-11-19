import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import reviewRoutes from './routes/reviewRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ReviewLens API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    aiProvider: process.env.AI_PROVIDER || 'kimi',
  });
});

// Mount Review Routes
app.use('/api/reviews', reviewRoutes);

// Connect Database
connectDB().catch((err) => {
  console.warn('Initial DB connection attempt returned:', err.message);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 ReviewLens Server listening on http://localhost:${PORT}`);
  });
}

export default app;
