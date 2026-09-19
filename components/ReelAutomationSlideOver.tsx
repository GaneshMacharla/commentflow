'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Film,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Zap,
  Eye,
} from 'lucide-react';
import { MatchType, MatchMode } from '@/lib/automation/types';
import { interpolateVariables } from '@/lib/automation/variables';

interface MediaItem {
  id: string;
  instagramMediaId?: string;
  mediaType: string;
  caption?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp: string;
  likeCount?: number;
  commentsCount?: number;
}

interface ReelAutomationSlideOverProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ReelAutomationSlideOver({
  media,
  isOpen,
  onClose,
  onSaved,
}: ReelAutomationSlideOverProps) {
  const [step, setStep] = useState(1);

  // Form state
  const [name, setName] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<MatchType>('CONTAINS');
  const [matchMode, setMatchMode] = useState<MatchMode>('ANY');
  const [enablePublicReply, setEnablePublicReply] = useState(true);
  const [publicReplyText, setPublicReplyText] = useState(
    'Thanks @{{username}}! Check your DM for the link 👋'
  );
  const [enablePrivateDm, setEnablePrivateDm] = useState(true);
  const [privateDmText, setPrivateDmText] = useState(
    'Hey {{username}} 👋 Thanks for your comment! Here is what you requested: https://example.com/link'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Reset form whenever a new media is selected
  useEffect(() => {
    if (media) {
      const mediaName = media.caption
        ? media.caption.slice(0, 30).replace(/\s+/g, ' ').trim()
        : media.mediaType;
      setName(`${mediaName} Automation`);
      setKeywords([]);
      setKeywordInput('');
      setMatchType('CONTAINS');
      setMatchMode('ANY');
      setEnablePublicReply(true);
      setEnablePrivateDm(true);
      setPublicReplyText('Thanks @{{username}}! Check your DM for the link 👋');
      setPrivateDmText(
        'Hey {{username}} 👋 Thanks for your comment! Here is what you requested: https://example.com/link'
      );
      setStep(1);
      setErrorMsg(null);
    }
  }, [media?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
    }
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim().toUpperCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  const insertVariable = (variable: string, target: 'reply' | 'dm') => {
    if (target === 'reply') {
      setPublicReplyText((prev) => `${prev}${variable}`);
    } else {
      setPrivateDmText((prev) => `${prev}${variable}`);
    }
  };

  const handleSave = async (status: 'ACTIVE' | 'PAUSED' = 'ACTIVE') => {
    if (keywords.length === 0) {
      setErrorMsg('Please add at least one trigger keyword.');
      return;
    }
    if (!enablePublicReply && !enablePrivateDm) {
      setErrorMsg('Please enable at least one action.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const mediaId = media?.instagramMediaId || media?.id || null;
      const payload = {
        name,
        mediaId,
        matchType,
        matchMode,
        keywords,
        publicReply: enablePublicReply ? publicReplyText : undefined,
        privateMessage: enablePrivateDm ? privateDmText : undefined,
      };

      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create automation');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create automation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReel = media?.mediaType === 'REEL' || media?.mediaType === 'VIDEO';

  if (!isOpen || !media) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Over Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Create automation for reel"
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg shadow-2xl shadow-black/60 bg-[#0c0f1a] border-l border-white/10 overflow-hidden animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create Automation</h2>
              <p className="text-[11px] text-slate-400">
                {isReel ? 'Reel' : 'Post'} ·{' '}
                {new Date(media.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-reel-automation-slideover"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Reel Preview */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-800">
              {media.thumbnailUrl ? (
                <img
                  src={media.thumbnailUrl}
                  alt="Reel thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  {isReel ? <Film className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
                </div>
              )}
              <div className="absolute inset-0 flex items-end p-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white">
                  {media.mediaType}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                {media.caption || 'No caption'}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" />
                  {(media.likeCount || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-blue-400" />
                  {(media.commentsCount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Progress */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Trigger' },
              { num: 2, label: 'Actions' },
              { num: 3, label: 'Preview' },
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    step === s.num
                      ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300'
                      : step > s.num
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border border-white/10 text-slate-500'
                  }`}
                >
                  {step > s.num ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-current/20 font-bold">
                      {s.num}
                    </span>
                  )}
                  {s.label}
                </button>
                {i < 2 && (
                  <div
                    className={`flex-1 h-px ${step > s.num ? 'bg-emerald-500/40' : 'bg-white/10'}`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Scrollable Step Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 min-h-0">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: TRIGGER KEYWORDS */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Automation Name
                </label>
                <input
                  id="automation-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g. Reel Giveaway Automation"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Trigger Keywords
                  <span className="ml-1 font-normal text-slate-500">
                    (Press Enter to add)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="keyword-input"
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. LINK, SEND, INFO"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    id="add-keyword-btn"
                    className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {kw}
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-2">
                    Add at least one keyword that will trigger this automation when someone comments.
                  </p>
                )}
              </div>

              {/* Match Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Match Rule
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'CONTAINS', label: 'Contains', desc: '"send link" → LINK ✓' },
                    { type: 'EXACT', label: 'Exact', desc: 'Must be exactly "LINK"' },
                  ].map((m) => (
                    <label
                      key={m.type}
                      onClick={() => setMatchType(m.type as MatchType)}
                      className={`p-3 rounded-xl border cursor-pointer block transition-all ${
                        matchType === m.type
                          ? 'bg-purple-600/15 border-purple-500 text-white'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="matchType"
                          checked={matchType === m.type}
                          onChange={() => setMatchType(m.type as MatchType)}
                          className="text-purple-600"
                        />
                        <span className="text-xs font-semibold">{m.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 pl-5">{m.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {keywords.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Multiple Keyword Logic
                  </label>
                  <div className="flex gap-3">
                    {[
                      { mode: 'ANY', label: 'Match ANY keyword' },
                      { mode: 'ALL', label: 'Match ALL keywords' },
                    ].map((m) => (
                      <label
                        key={m.mode}
                        className="flex items-center gap-2 cursor-pointer text-xs text-slate-300"
                      >
                        <input
                          type="radio"
                          name="matchMode"
                          checked={matchMode === m.mode}
                          onChange={() => setMatchMode(m.mode as MatchMode)}
                          className="text-purple-600"
                        />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONFIGURE ACTIONS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-xs text-slate-400">
                Choose what happens when a comment matches your keywords.
              </p>

              {/* Action A: Public Reply */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="enable-public-reply"
                    checked={enablePublicReply}
                    onChange={(e) => setEnablePublicReply(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    Public Comment Reply
                  </span>
                </label>

                {enablePublicReply && (
                  <div className="space-y-2 pl-6">
                    <textarea
                      rows={2}
                      id="public-reply-text"
                      value={publicReplyText}
                      onChange={(e) => setPublicReplyText(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-mono resize-none"
                      placeholder="e.g. Thanks @{{username}}! Check your DMs 👋"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500">Insert:</span>
                      {['{{username}}', '{{comment}}'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v, 'reply')}
                          className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 text-[11px] transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action B: Private DM */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="enable-private-dm"
                    checked={enablePrivateDm}
                    onChange={(e) => setEnablePrivateDm(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-pink-400" />
                    Private Instagram DM
                  </span>
                </label>

                {enablePrivateDm && (
                  <div className="space-y-2 pl-6">
                    <textarea
                      rows={3}
                      id="private-dm-text"
                      value={privateDmText}
                      onChange={(e) => setPrivateDmText(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-mono resize-none"
                      placeholder="e.g. Hey {{username}} 👋 Here is your link: https://..."
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500">Insert:</span>
                      {['{{username}}', '{{comment}}', '{{post_url}}'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v, 'dm')}
                          className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 text-[11px] transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block mb-0.5">Keywords</span>
                  <span className="font-semibold text-purple-300">
                    {keywords.join(', ') || '—'} ({matchType})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-slate-400 block mb-0.5">Actions</span>
                  <span className="font-semibold text-white">
                    {enablePublicReply && enablePrivateDm
                      ? 'Reply + DM'
                      : enablePublicReply
                      ? 'Public Reply'
                      : enablePrivateDm
                      ? 'Private DM'
                      : 'None'}
                  </span>
                </div>
              </div>

              {/* Live Preview */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5" />
                  Live Simulation Preview
                </h3>

                {/* Comment Thread */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 mb-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Instagram Comment Thread
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                      JD
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200">jaydoe </span>
                      <span className="text-slate-300">
                        {keywords[0] || 'LINK'} please send me the info!
                      </span>
                    </div>
                  </div>
                  {enablePublicReply && (
                    <div className="flex items-start gap-2.5 text-xs pl-8 border-l-2 border-purple-500/40 ml-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                        CF
                      </div>
                      <div>
                        <span className="font-semibold text-purple-300">your_account </span>
                        <span className="text-slate-200">
                          {interpolateVariables(publicReplyText, {
                            username: 'jaydoe',
                            comment: keywords[0] || 'LINK',
                            post_url: media.permalink || 'https://instagram.com/p/example',
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* DM Preview */}
                {enablePrivateDm && (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                    <div className="text-[11px] font-semibold text-slate-500">
                      Instagram DM Inbox (sent to commenter)
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs leading-relaxed shadow-lg">
                        {interpolateVariables(privateDmText, {
                          username: 'jaydoe',
                          comment: keywords[0] || 'LINK',
                          post_url: media.permalink || 'https://instagram.com/p/example',
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-4 border-t border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                id={`next-step-${step}-btn`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 hover:opacity-95 transition-opacity"
              >
                {step === 1 ? 'Configure Actions' : 'Preview & Save'}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSave('PAUSED')}
                  disabled={isSubmitting}
                  id="save-paused-btn"
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Save Paused
                </button>
                <button
                  onClick={() => handleSave('ACTIVE')}
                  disabled={isSubmitting}
                  id="activate-automation-btn"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Activating...' : 'Activate'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
