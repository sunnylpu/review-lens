import React from 'react';
import { Timer, Zap, Database, PiggyBank } from 'lucide-react';

export default function PerformanceRibbon({ performance }) {
  if (!performance) return null;

  const { durationMs = 0, aiCallsCount = 0, cacheHitsCount = 0, cacheHitRate = 0 } = performance;

  return (
    <div className="bg-zinc-900 text-zinc-100 rounded-lg p-3.5 shadow-card flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
      <div className="flex items-center space-x-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-zinc-400 font-sans text-xs">Runtime Performance & Cost Log:</span>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center space-x-2">
          <Timer className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-400">Duration:</span>
          <span className="font-semibold text-white">{durationMs} ms</span>
        </div>

        <div className="flex items-center space-x-2">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-zinc-400">AI Calls:</span>
          <span className="font-semibold text-white">{aiCallsCount}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Database className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-zinc-400">SHA-256 Cache Hits:</span>
          <span className="font-semibold text-white">{cacheHitsCount}</span>
        </div>

        <div className="flex items-center space-x-2">
          <PiggyBank className="h-3.5 w-3.5 text-sky-400" />
          <span className="text-zinc-400">Saved Token Ratio:</span>
          <span className="font-semibold text-emerald-400">{cacheHitRate}%</span>
        </div>
      </div>
    </div>
  );
}
