import React from 'react';
import { Layers, Database, Sparkles, Activity } from 'lucide-react';

export default function Header({ aiProvider, isConnected, batchId, onReloadSample, isProcessing }) {
  return (
    <header className="border-b border-zinc-200/80 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="h-9 w-9 rounded-md bg-zinc-900 flex items-center justify-center text-white font-mono font-bold text-sm shadow-subtle">
            RL
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-zinc-900 tracking-tight">ReviewLens</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                v1.0
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-normal">AI Product Review Intelligence & Store Operations</p>
          </div>
        </div>

        {/* Status Indicators & Fast Actions */}
        <div className="flex items-center space-x-3">
          {batchId && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-600">
              <Layers className="h-3.5 w-3.5 text-zinc-400" />
              <span>{batchId.slice(0, 16)}</span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-700">
            <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
            <span>AI: <strong className="font-semibold text-zinc-900 uppercase text-[11px] font-mono">{aiProvider || 'Kimi'}</strong></span>
          </div>

          <button
            onClick={onReloadSample}
            disabled={isProcessing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950 transition-colors shadow-subtle disabled:opacity-50"
          >
            <Activity className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{isProcessing ? 'Analyzing...' : 'Load Sample CSV'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
