import { getConnectionStatus } from '../config/db.js';
import AnalysisCache from '../models/AnalysisCache.js';

// In-Memory Fallback Cache Store (used if MongoDB is not running)
const memoryCacheStore = new Map();

/**
 * Cache Service for Review Analyses
 * Provides instant SHA-256 cache hits for duplicate reviews across uploads.
 * Supports dual-mode: MongoDB persistent collection or in-memory fallback.
 */

export async function getCachedAnalyses(hashes = []) {
  if (!hashes || hashes.length === 0) return new Map();

  const { isConnected } = getConnectionStatus();
  const resultMap = new Map();

  if (isConnected) {
    try {
      const records = await AnalysisCache.find({ text_hash: { $in: hashes } }).lean();
      for (const record of records) {
        resultMap.set(record.text_hash, {
          sentiment: record.sentiment,
          topics: record.topics,
          summary: record.summary,
          needs_reply: record.needs_reply,
          provider: record.provider,
          model: record.model,
          from_cache: true,
        });
      }

      // Increment hit_count asynchronously
      if (records.length > 0) {
        AnalysisCache.updateMany(
          { text_hash: { $in: records.map((r) => r.text_hash) } },
          { $inc: { hit_count: 1 } }
        ).catch(() => {});
      }
      return resultMap;
    } catch (err) {
      console.warn('MongoDB cache lookup failed, falling back to memory cache:', err.message);
    }
  }

  // Fallback memory cache
  for (const hash of hashes) {
    if (memoryCacheStore.has(hash)) {
      const cached = memoryCacheStore.get(hash);
      cached.hit_count = (cached.hit_count || 1) + 1;
      resultMap.set(hash, {
        ...cached,
        from_cache: true,
      });
    }
  }

  return resultMap;
}

export async function setCachedAnalysis(text_hash, analysis, metadata = {}) {
  if (!text_hash || !analysis) return null;

  const payload = {
    text_hash,
    sentiment: analysis.sentiment,
    topics: analysis.topics || [],
    summary: analysis.summary,
    needs_reply: Boolean(analysis.needs_reply),
    provider: metadata.provider || 'kimi',
    model: metadata.model || 'moonshot-v1-8k',
  };

  // Always update memory cache
  memoryCacheStore.set(text_hash, { ...payload, hit_count: 1 });

  const { isConnected } = getConnectionStatus();
  if (isConnected) {
    try {
      await AnalysisCache.findOneAndUpdate(
        { text_hash },
        { $set: payload, $setOnInsert: { hit_count: 1 } },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn(`Failed to persist cache to MongoDB for hash ${text_hash}:`, err.message);
    }
  }

  return payload;
}

export async function setCachedAnalysesBatch(items = [], metadata = {}) {
  if (!items || items.length === 0) return;

  const { isConnected } = getConnectionStatus();
  const operations = [];

  for (const item of items) {
    if (!item.text_hash || !item.analysis) continue;

    const payload = {
      text_hash: item.text_hash,
      sentiment: item.analysis.sentiment,
      topics: item.analysis.topics || [],
      summary: item.analysis.summary,
      needs_reply: Boolean(item.analysis.needs_reply),
      provider: metadata.provider || 'kimi',
      model: metadata.model || 'moonshot-v1-8k',
    };

    memoryCacheStore.set(item.text_hash, { ...payload, hit_count: 1 });

    if (isConnected) {
      operations.push({
        updateOne: {
          filter: { text_hash: item.text_hash },
          update: { $set: payload, $setOnInsert: { hit_count: 1 } },
          upsert: true,
        },
      });
    }
  }

  if (isConnected && operations.length > 0) {
    try {
      await AnalysisCache.bulkWrite(operations, { ordered: false });
    } catch (err) {
      console.warn('MongoDB bulkWrite cache failed:', err.message);
    }
  }
}

export function clearMemoryCache() {
  memoryCacheStore.clear();
}

export function getMemoryCacheSize() {
  return memoryCacheStore.size;
}
