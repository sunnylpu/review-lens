import React, { useState } from 'react';
import { Package, Star, AlertCircle, ThumbsUp, ArrowLeft } from 'lucide-react';

export default function ProductDeepDive({ products, onSelectProductFilter }) {
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.product || null);

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center shadow-card">
        <Package className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-zinc-600">No product analytics available yet.</p>
        <p className="text-xs text-zinc-400 mt-0.5">Please upload reviews to populate the product view.</p>
      </div>
    );
  }

  const current = products.find((p) => p.product === selectedProduct) || products[0];

  return (
    <div className="space-y-4">
      {/* Product Pills Selector */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {products.map((p) => (
          <button
            key={p.product}
            onClick={() => setSelectedProduct(p.product)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              selectedProduct === p.product
                ? 'bg-zinc-900 text-white shadow-subtle'
                : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
            }`}
          >
            {p.product} ({p.totalReviews})
          </button>
        ))}
      </div>

      {current && (
        <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-card space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-zinc-900">{current.product}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                  {current.totalReviews} Total Reviews
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Comprehensive SKU sentiment distribution & complaints</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[11px] text-zinc-400 uppercase font-mono block">Average Rating</span>
                <span className="text-lg font-bold font-mono text-zinc-900 flex items-center justify-end space-x-1">
                  <span>{current.avgRating ? `${current.avgRating} / 5` : 'N/A'}</span>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </span>
              </div>
            </div>
          </div>

          {/* Sentiment Split Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-700 font-semibold">{current.sentimentSplit.positive}% Positive</span>
              <span className="text-zinc-600 font-semibold">{current.sentimentSplit.neutral}% Neutral</span>
              <span className="text-rose-700 font-semibold">{current.sentimentSplit.negative}% Negative</span>
            </div>
            <div className="w-full h-2 bg-zinc-100 rounded-full flex overflow-hidden">
              <div
                style={{ width: `${current.sentimentSplit.positive}%` }}
                className="bg-emerald-500 h-full"
              />
              <div
                style={{ width: `${current.sentimentSplit.neutral}%` }}
                className="bg-zinc-400 h-full"
              />
              <div
                style={{ width: `${current.sentimentSplit.negative}%` }}
                className="bg-rose-500 h-full"
              />
            </div>
          </div>

          {/* Top Issues & Praises for this SKU */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Top Friction Issues */}
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <span>Top Friction Points & Complaints</span>
              </div>
              <div className="space-y-2">
                {current.topIssues.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No recurring complaints reported.</p>
                ) : (
                  current.topIssues.map((issue, idx) => (
                    <div key={idx} className="p-2 rounded bg-white border border-zinc-200/60 text-xs text-zinc-700">
                      <span className="font-mono text-[10px] text-zinc-400 mr-1.5">#{idx + 1}</span>
                      <span>{issue.issue}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Praises */}
            <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-800">
                <ThumbsUp className="h-4 w-4 text-emerald-600" />
                <span>Top Praises & Selling Points</span>
              </div>
              <div className="space-y-2">
                {current.topPraises.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No praises recorded yet.</p>
                ) : (
                  current.topPraises.map((praise, idx) => (
                    <div key={idx} className="p-2 rounded bg-white border border-zinc-200/60 text-xs text-zinc-700">
                      <span className="font-mono text-[10px] text-zinc-400 mr-1.5">#{idx + 1}</span>
                      <span>{praise.praise}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* View in Table Link */}
          <div className="pt-2 border-t border-zinc-100 flex justify-end">
            <button
              onClick={() => onSelectProductFilter(current.product)}
              className="text-xs font-medium text-zinc-900 hover:underline flex items-center space-x-1"
            >
              <span>View all reviews for {current.product} in table &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
