'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Mail,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationComplete?: () => void;
}

export default function WebhookSimulatorModal({
  isOpen,
  onClose,
  onSimulationComplete,
}: WebhookSimulatorModalProps) {
  const [commentText, setCommentText] = useState('I want the AI roadmap please!');
  const [commenterUsername, setCommenterUsername] = useState('alex_creator');
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [fixedCommentId, setFixedCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/instagram/media')
        .then((res) => res.json())
        .then((data) => {
          if (data.media && data.media.length > 0) {
            setMediaList(data.media);
            if (!selectedMediaId) {
              setSelectedMediaId(data.media[0].instagramMediaId || data.media[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulate = async (customId?: string) => {
    setIsLoading(true);
    setSimResult(null);

    const commentId = customId || fixedCommentId || `sim_comment_${Date.now()}`;

    try {
      const response = await fetch('/api/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText,
          commenterUsername,
          mediaId: selectedMediaId,
          commentId,
        }),
      });

      const data = await response.json();
      setSimResult(data);
      if (onSimulationComplete) onSimulationComplete();
    } catch (err: any) {
      setSimResult({
        success: false,
        error: err.message || 'Failed to trigger simulation',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setPreset = (text: string, mediaId?: string) => {
    setCommentText(text);
    if (mediaId) setSelectedMediaId(mediaId);
    setFixedCommentId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl glass-card border border-white/15 bg-[#0f121d] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Instagram Webhook Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Safe test mode — runs through the automation engine without sending live DMs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
            Quick Test Presets
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPreset('AI')}
              className="px-2.5 py-1 rounded-md text-xs bg-purple-500/10 text-purple-300 border border-purple-500/25 hover:bg-purple-500/20 transition-colors"
            >
              Exact Match ("AI")
            </button>
            <button
              onClick={() => setPreset('I want the AI roadmap please!')}
              className="px-2.5 py-1 rounded-md text-xs bg-blue-500/10 text-blue-300 border border-blue-500/25 hover:bg-blue-500/20 transition-colors"
            >
              Contains Keyword
            </button>
            <button
              onClick={() => setPreset('Awesome video! Love your setup.')}
              className="px-2.5 py-1 rounded-md text-xs bg-slate-500/10 text-slate-300 border border-slate-500/25 hover:bg-slate-500/20 transition-colors"
            >
              Non-Matching Comment
            </button>
            <button
              onClick={() => {
                const fixed = 'duplicate_comment_id_999';
                setFixedCommentId(fixed);
                setPreset('AI roadmap test');
              }}
              className="px-2.5 py-1 rounded-md text-xs bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 transition-colors"
            >
              Test Idempotency (Duplicate ID)
            </button>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Post or Reel
              </label>
              <select
                value={selectedMediaId}
                onChange={(e) => setSelectedMediaId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="" className="bg-[#0f121d]">
                  All Posts & Reels (Global)
                </option>
                {mediaList.map((m) => (
                  <option
                    key={m.id}
                    value={m.instagramMediaId || m.id}
                    className="bg-[#0f121d]"
                  >
                    {m.mediaType}: {m.caption?.slice(0, 30) || 'Post'}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Commenter Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 text-sm">@</span>
                <input
                  type="text"
                  value={commenterUsername}
                  onChange={(e) => setCommenterUsername(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                  placeholder="instagram_user"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Incoming Comment Text
            </label>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
              placeholder="e.g. AI"
            />
            {fixedCommentId && (
              <p className="mt-1 text-[11px] text-amber-400">
                ⚠️ Fixed Event ID set: <code>{fixedCommentId}</code> (Will trigger duplicate suppression on 2nd attempt)
              </p>
            )}
          </div>

          <button
            onClick={() => handleSimulate()}
            disabled={isLoading || !commentText.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Evaluating automation rules...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Simulate Webhook Event
              </>
            )}
          </button>
        </div>

        {/* Real-Time Simulation Result */}
        {simResult && (
          <div className="mt-5 p-4 rounded-xl border border-white/10 bg-black/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Engine Evaluation Result
              </span>
              {simResult.result?.matched ? (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  MATCHED & TRIGGERED
                </span>
              ) : simResult.result?.error ? (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {simResult.result.error}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
                  NO MATCH (SKIPPED)
                </span>
              )}
            </div>

            {/* Actions Output */}
            {simResult.result?.results && simResult.result.results.length > 0 && (
              <div className="space-y-2 pt-2">
                {simResult.result.results.map((act: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-purple-300">
                      {act.type === 'PUBLIC_REPLY' ? (
                        <>
                          <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                          <span>Action: Public Comment Reply</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 text-pink-400" />
                          <span>Action: Private Instagram DM</span>
                        </>
                      )}
                    </div>
                    <div className="text-slate-200 bg-black/30 p-2 rounded border border-white/5 font-mono text-[11px]">
                      "{act.message}"
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!simResult.result?.matched && !simResult.result?.error && (
              <p className="text-xs text-slate-400">
                Comment "{commentText}" did not trigger any active automations for the selected content.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
