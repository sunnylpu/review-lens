import React, { useState, useRef } from 'react';
import { Upload, FileText, ArrowRight, Clipboard, FileSpreadsheet, FileCode } from 'lucide-react';

export default function FileUploadZone({ onFileUpload, onTextSubmit, onLoadSample, isProcessing }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [dragActive, setDragActive] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handlePasteSubmit = (e) => {
    e.preventDefault();
    if (pastedText.trim()) {
      onTextSubmit(pastedText);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-card p-5">
      {/* Sub-header Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
        <div className="flex items-center space-x-1 bg-zinc-100 p-0.5 rounded-md">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Universal Ingestion (CSV, Excel, PDF, Docs)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'paste'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Direct Text Paste
          </button>
        </div>

        <button
          type="button"
          onClick={onLoadSample}
          disabled={isProcessing}
          className="text-xs font-mono text-zinc-600 hover:text-zinc-900 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          <span>Use CEDCOSS 30-Row reviews.csv</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-7 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-zinc-900 bg-zinc-50/80'
              : 'border-zinc-200/90 hover:border-zinc-400 bg-zinc-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.docx,.json,.jsonl"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Drag and drop your review file, or <span className="underline decoration-zinc-400 underline-offset-2">browse</span>
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Multi-format engine handles messy, duplicate, and raw multilingual feedback without crashing.
              </p>
            </div>

            {/* Format Pills */}
            <div className="flex items-center space-x-1.5 pt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 bg-white border border-zinc-200">
                .CSV (RFC 4180)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 bg-white border border-zinc-200">
                .XLSX (Excel)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 bg-white border border-zinc-200">
                .PDF
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 bg-white border border-zinc-200">
                .DOCX
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 bg-white border border-zinc-200">
                .JSON
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePasteSubmit} className="space-y-3">
          <textarea
            rows={4}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Paste raw reviews here (separated by newlines or paragraphs)...
Example:
R001, Cotton Bedsheet Set, 5, 2026-10-02, Super soft fabric!
R002, Ceramic Coffee Mug, 1, 2026-10-04, One mug arrived broken.`}
            className="w-full text-xs font-mono p-3 rounded-md border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder-zinc-400"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !pastedText.trim()}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-subtle"
            >
              Parse & Analyze Text
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
