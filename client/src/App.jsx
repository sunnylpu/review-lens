import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              RL
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">ReviewLens</h1>
              <p className="text-xs text-slate-500">AI-Powered Review Insights for Store Owners</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            MERN Stack Initialized
          </span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">ReviewLens Workspace Ready</h2>
          <p className="text-slate-600 max-w-xl mx-auto mb-6">
            ReviewLens transforms messy product customer reviews into actionable store insights.
          </p>
        </div>
      </main>
    </div>
  );
}
