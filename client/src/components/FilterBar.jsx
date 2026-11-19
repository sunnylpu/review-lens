import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function FilterBar({
  filters,
  products,
  onFilterChange,
  onResetFilters,
  resultCount,
}) {
  const topicsList = ['quality', 'delivery', 'price', 'packaging', 'support', 'size_fit', 'other'];

  const hasActiveFilters =
    filters.product !== 'all' ||
    filters.sentiment !== 'all' ||
    filters.topic !== 'all' ||
    filters.needs_reply === 'true' ||
    filters.mismatch_only === 'true' ||
    filters.broken_only === 'true' ||
    filters.search !== '';

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-3.5 shadow-card space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search reviews by keyword, product, ID, or summary..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-md border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder-zinc-400"
          />
        </div>

        {/* Filters Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Product Filter */}
          <select
            value={filters.product}
            onChange={(e) => onFilterChange('product', e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Sentiment Filter */}
          <select
            value={filters.sentiment}
            onChange={(e) => onFilterChange('sentiment', e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
          >
            <option value="all">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>

          {/* Topic Filter */}
          <select
            value={filters.topic}
            onChange={(e) => onFilterChange('topic', e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium capitalize"
          >
            <option value="all">All Topics</option>
            {topicsList.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Toggles Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-zinc-400 uppercase font-mono tracking-wider">Quick Toggles:</span>

          <button
            onClick={() =>
              onFilterChange('needs_reply', filters.needs_reply === 'true' ? 'all' : 'true')
            }
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              filters.needs_reply === 'true'
                ? 'bg-rose-100/80 text-rose-800 border border-rose-300 font-semibold'
                : 'bg-zinc-100/60 text-zinc-600 hover:bg-zinc-100 border border-zinc-200/70'
            }`}
          >
            Needs Reply
          </button>

          <button
            onClick={() =>
              onFilterChange('mismatch_only', filters.mismatch_only === 'true' ? 'all' : 'true')
            }
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              filters.mismatch_only === 'true'
                ? 'bg-amber-100/80 text-amber-800 border border-amber-300 font-semibold'
                : 'bg-zinc-100/60 text-zinc-600 hover:bg-zinc-100 border border-zinc-200/70'
            }`}
          >
            Rating Mismatch ⚠️
          </button>

          <button
            onClick={() =>
              onFilterChange('broken_only', filters.broken_only === 'true' ? 'all' : 'true')
            }
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              filters.broken_only === 'true'
                ? 'bg-zinc-900 text-white font-semibold'
                : 'bg-zinc-100/60 text-zinc-600 hover:bg-zinc-100 border border-zinc-200/70'
            }`}
          >
            Broken Inputs Only
          </button>
        </div>

        <span className="text-xs font-mono text-zinc-500">
          Showing <strong>{resultCount}</strong> review{resultCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}
