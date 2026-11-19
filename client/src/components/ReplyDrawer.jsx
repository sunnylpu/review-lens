import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, Send, RefreshCw } from 'lucide-react';

export default function ReplyDrawer({ review, isOpen, onClose, onGenerateReply }) {
  const [replyText, setReplyText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (review) {
      setReplyText(review.suggested_reply || '');
      if (!review.suggested_reply) {
        handleGenerate();
      }
    }
  }, [review]);

  const handleGenerate = async () => {
    if (!review) return;
    setIsLoading(true);
    try {
      const generated = await onGenerateReply(review.review_id);
      setReplyText(generated || '');
    } catch (err) {
      console.error('Failed to generate reply:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(replyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-zinc-200 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded bg-zinc-100 text-zinc-800">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">AI Suggested Store Reply</h3>
                <p className="text-xs text-zinc-500 font-mono">Review ID: {review.review_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Customer Review Summary Card */}
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">{review.product}</span>
                <span className="font-mono font-medium text-zinc-700">{review.rating ? `${review.rating}★` : 'Unrated'}</span>
              </div>
              <p className="text-zinc-600 italic font-sans text-xs">
                "{review.cleaned_text || review.original_text}"
              </p>
              {review.summary && (
                <div className="pt-1 border-t border-zinc-200/60 text-[11px] text-zinc-500">
                  <strong>Issue:</strong> {review.summary}
                </div>
              )}
            </div>

            {/* Generated Reply Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-800 flex items-center space-x-1.5">
                  <span>Customer Support Draft</span>
                  {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-zinc-500" />}
                </label>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center space-x-1 disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Regenerate</span>
                </button>
              </div>

              {isLoading ? (
                <div className="h-36 rounded-md border border-zinc-200 bg-zinc-50/50 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-xs font-mono">Synthesizing empathetic response...</span>
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full text-xs font-sans p-3 rounded-md border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 leading-relaxed shadow-xs"
                  placeholder="Generating reply..."
                />
              )}
            </div>

            {/* Hint */}
            <p className="text-[11px] text-zinc-400">
              Generated on-demand via Kimi / Moonshot AI. You can edit this text directly before copying or sending to the customer.
            </p>
          </div>

          {/* Drawer Footer */}
          <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleCopy}
              disabled={isLoading || !replyText}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-subtle disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
