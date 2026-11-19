import React from 'react';
import { MessageSquare, ThumbsUp, AlertTriangle, CheckCircle, Scale } from 'lucide-react';

export default function KpiSummaryCards({ summary, onFilterChange }) {
  if (!summary) return null;

  const {
    totalReviews = 0,
    validReviewsCount = 0,
    emptySkippedCount = 0,
    sentiment = { positive: { count: 0, percentage: 0 }, neutral: { count: 0, percentage: 0 }, negative: { count: 0, percentage: 0 } },
    needsReplyCount = 0,
    ratingAgreement = { agreementPercent: 100, mismatchedCount: 0 },
  } = summary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Ingested & Analyzed */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-card">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-medium">Total Reviews Analyzed</span>
          <MessageSquare className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-zinc-900">{validReviewsCount}</span>
          <span className="text-xs font-mono text-zinc-500">/ {totalReviews} total</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          {emptySkippedCount} blank row{emptySkippedCount === 1 ? '' : 's'} skipped (0 tokens wasted)
        </p>
      </div>

      {/* 2. Sentiment Split */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-card">
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-medium">Sentiment Breakdown</span>
          <ThumbsUp className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono my-1">
          <span className="text-emerald-700 font-bold">{sentiment.positive.percentage}% Pos</span>
          <span className="text-zinc-600 font-bold">{sentiment.neutral.percentage}% Neu</span>
          <span className="text-rose-700 font-bold">{sentiment.negative.percentage}% Neg</span>
        </div>
        {/* Visual Progress Bar */}
        <div className="w-full h-1.5 bg-zinc-100 rounded-full flex overflow-hidden mt-3">
          <div style={{ width: `${sentiment.positive.percentage}%` }} className="bg-emerald-500 h-full" />
          <div style={{ width: `${sentiment.neutral.percentage}%` }} className="bg-zinc-400 h-full" />
          <div style={{ width: `${sentiment.negative.percentage}%` }} className="bg-rose-500 h-full" />
        </div>
      </div>

      {/* 3. Action Required (Needs Reply) */}
      <div
        onClick={() => onFilterChange && onFilterChange('needs_reply', 'true')}
        className="bg-white rounded-lg border border-zinc-200 p-4 shadow-card hover:border-zinc-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-medium">Critical Action Required</span>
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-rose-600">{needsReplyCount}</span>
          <span className="text-xs text-zinc-500">reviews need replies</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2 flex items-center space-x-1">
          <span>Click to view unresolved issues</span>
        </p>
      </div>

      {/* 4. Rating vs Sentiment Agreement (Bonus 1) */}
      <div
        onClick={() => onFilterChange && onFilterChange('mismatch_only', 'true')}
        className="bg-white rounded-lg border border-zinc-200 p-4 shadow-card hover:border-zinc-300 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between text-zinc-500 mb-1">
          <span className="text-xs font-medium">Rating vs AI Agreement</span>
          <Scale className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold font-mono text-zinc-900">
            {ratingAgreement.agreementPercent}%
          </span>
          {ratingAgreement.mismatchedCount > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              {ratingAgreement.mismatchedCount} mismatch
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          Flags accidental inverted ratings (e.g. 5★ with bad text)
        </p>
      </div>
    </div>
  );
}
