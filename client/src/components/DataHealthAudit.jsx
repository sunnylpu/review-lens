import React from 'react';
import { ShieldCheck, AlertCircle, FileX, Copy, Code, Sparkles } from 'lucide-react';

export default function DataHealthAudit({ audit }) {
  if (!audit) return null;

  const {
    totalRows = 0,
    healthScore = 100,
    emptySkipped = 0,
    duplicatesFound = 0,
    injectionsDefused = 0,
    htmlCleaned = 0,
    ratingsNormalized = 0,
    nonEnglishDetected = 0,
  } = audit;

  return (
    <div className="bg-white rounded-lg border border-zinc-200/90 shadow-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded bg-zinc-100 text-zinc-700">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">Input Triage & Diagnostic Audit</h3>
            <p className="text-[11px] text-zinc-500">Autonomous edge-case sanitization before LLM dispatch</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 font-mono">Dataset Health:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {healthScore}% Clean
          </span>
        </div>
      </div>

      {/* Diagnostics Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="px-2.5 py-1.5 rounded border border-zinc-200/70 bg-zinc-50/50 flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Empty Skipped</span>
          <span className="text-sm font-semibold font-mono text-zinc-800">{emptySkipped}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded border border-zinc-200/70 bg-zinc-50/50 flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Duplicates Merged</span>
          <span className="text-sm font-semibold font-mono text-zinc-800">{duplicatesFound}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded border border-zinc-200/70 bg-zinc-50/50 flex flex-col">
          <span className="text-[10px] text-rose-700 uppercase tracking-wider font-mono">Injections Defused</span>
          <span className="text-sm font-semibold font-mono text-rose-800">{injectionsDefused}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded border border-zinc-200/70 bg-zinc-50/50 flex flex-col">
          <span className="text-[10px] text-amber-700 uppercase tracking-wider font-mono">HTML Cleaned</span>
          <span className="text-sm font-semibold font-mono text-amber-800">{htmlCleaned}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded border border-zinc-200/70 bg-zinc-50/50 flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Ratings Normalized</span>
          <span className="text-sm font-semibold font-mono text-zinc-800">{ratingsNormalized}</span>
        </div>

        <div className="px-2.5 py-1.5 rounded border border-zinc-200/70 bg-zinc-50/50 flex flex-col">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Hindi / Hinglish</span>
          <span className="text-sm font-semibold font-mono text-zinc-800">{nonEnglishDetected}</span>
        </div>
      </div>
    </div>
  );
}
