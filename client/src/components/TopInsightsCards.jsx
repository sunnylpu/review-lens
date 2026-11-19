import React from 'react';
import { AlertCircle, CheckCircle2, Tag } from 'lucide-react';

export default function TopInsightsCards({ topInsights }) {
  if (!topInsights) return null;

  const { topComplaints = [], topPraises = [] } = topInsights;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top 3 Complaints */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-card">
        <div className="flex items-center space-x-2 border-b border-zinc-100 pb-2.5 mb-3">
          <div className="p-1 rounded bg-rose-50 text-rose-600">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">Top 3 Customer Complaints</h3>
            <p className="text-[11px] text-zinc-500">Primary friction points requiring store intervention</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {topComplaints.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No critical complaints detected.</p>
          ) : (
            topComplaints.map((item, index) => (
              <div
                key={item.review_id || index}
                className="p-2.5 rounded-md bg-zinc-50/70 border border-zinc-100 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] text-zinc-400">#{index + 1}</span>
                    <span className="font-medium text-zinc-900">{item.product}</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-rose-50/70 text-rose-700 border border-rose-200/50">
                      {item.topic}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs">{item.issue}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top 3 Praises */}
      <div className="bg-white rounded-lg border border-zinc-200 p-4 shadow-card">
        <div className="flex items-center space-x-2 border-b border-zinc-100 pb-2.5 mb-3">
          <div className="p-1 rounded bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">Top 3 Customer Praises</h3>
            <p className="text-[11px] text-zinc-500">Features and qualities customers love most</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {topPraises.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No praises recorded yet.</p>
          ) : (
            topPraises.map((item, index) => (
              <div
                key={item.review_id || index}
                className="p-2.5 rounded-md bg-zinc-50/70 border border-zinc-100 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] text-zinc-400">#{index + 1}</span>
                    <span className="font-medium text-zinc-900">{item.product}</span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-emerald-50/70 text-emerald-700 border border-emerald-200/50">
                      {item.topic}
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs">{item.praise}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
