import React from 'react';
import { Star, AlertTriangle, Send, CheckCircle2, XCircle } from 'lucide-react';

export default function ReviewTable({ reviews, onOpenReplyDrawer }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center shadow-card">
        <p className="text-sm text-zinc-500 font-medium">No reviews match the selected filters.</p>
        <p className="text-xs text-zinc-400 mt-1">Try resetting the search query or adjusting your filters.</p>
      </div>
    );
  }

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Positive
          </span>
        );
      case 'neutral':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/60">
            Neutral
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            Negative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200">
            Skipped
          </span>
        );
    }
  };

  const getDiagnosticBadgeClass = (tone) => {
    switch (tone) {
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'amber':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              <th className="py-2.5 px-3.5">ID</th>
              <th className="py-2.5 px-3.5">Product</th>
              <th className="py-2.5 px-3.5">Rating</th>
              <th className="py-2.5 px-3.5">Diagnostics</th>
              <th className="py-2.5 px-3.5">Sentiment</th>
              <th className="py-2.5 px-3.5">Topics</th>
              <th className="py-2.5 px-3.5 min-w-[280px]">Summary & Customer Text</th>
              <th className="py-2.5 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs">
            {reviews.map((r) => {
              const isMismatch = r.rating_mismatch;
              const badges = r.diagnostics?.badges || [];

              return (
                <tr
                  key={r.review_id}
                  className={`hover:bg-zinc-50/70 transition-colors ${
                    isMismatch ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* ID */}
                  <td className="py-3 px-3.5 font-mono font-medium text-zinc-900 whitespace-nowrap">
                    {r.review_id}
                  </td>

                  {/* Product */}
                  <td className="py-3 px-3.5 font-medium text-zinc-800 whitespace-nowrap">
                    {r.product}
                  </td>

                  {/* Rating */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      {r.rating !== null ? (
                        <span className="font-mono font-semibold text-zinc-900 flex items-center">
                          {r.rating}★
                        </span>
                      ) : (
                        <span className="font-mono text-zinc-400 text-[11px]">Unrated</span>
                      )}

                      {isMismatch && (
                        <span
                          title={`Rating Mismatch: ${r.rating}★ vs ${r.sentiment} text`}
                          className="text-amber-600"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Diagnostics Badges */}
                  <td className="py-3 px-3.5">
                    <div className="flex flex-wrap gap-1">
                      {badges.map((b, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${getDiagnosticBadgeClass(
                            b.tone
                          )}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Sentiment */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {getSentimentBadge(r.sentiment)}
                  </td>

                  {/* Topics */}
                  <td className="py-3 px-3.5">
                    <div className="flex flex-wrap gap-1">
                      {r.topics && r.topics.length > 0 ? (
                        r.topics.map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600 border border-zinc-200"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-400 font-mono text-[11px]">-</span>
                      )}
                    </div>
                  </td>

                  {/* Summary & Customer Text */}
                  <td className="py-3 px-3.5">
                    <div className="space-y-1">
                      {r.summary && (
                        <p className="font-medium text-zinc-900 line-clamp-1">{r.summary}</p>
                      )}
                      <p className="text-zinc-500 text-[11px] line-clamp-2 italic font-sans">
                        "{r.original_text || r.cleaned_text || 'Empty feedback'}"
                      </p>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    {r.needs_reply ? (
                      <button
                        onClick={() => onOpenReplyDrawer(r)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-subtle"
                      >
                        <Send className="h-3 w-3" />
                        <span>{r.suggested_reply ? 'View Reply' : 'Draft Reply'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-zinc-400">Resolved</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
