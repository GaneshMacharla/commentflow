'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Film,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  MessageCircle,
  Mail,
  HelpCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { MatchType, MatchMode } from '@/lib/automation/types';
import { interpolateVariables } from '@/lib/automation/variables';

interface AutomationBuilderProps {
  initialMediaId?: string | null;
  existingAutomation?: any;
}

export default function AutomationBuilder({
  initialMediaId = null,
  existingAutomation = null,
}: AutomationBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  // Form State
  const [name, setName] = useState(existingAutomation?.name || 'AI Roadmap Automation');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(
    initialMediaId || existingAutomation?.mediaId || null
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(
    existingAutomation?.triggers?.map((t: any) => t.keyword) || ['AI', 'ROADMAP']
  );
  const [matchType, setMatchType] = useState<MatchType>(
    existingAutomation?.matchType || 'CONTAINS'
  );
  const [matchMode, setMatchMode] = useState<MatchMode>(
    existingAutomation?.matchMode || 'ANY'
  );

  // Action settings
  const [enablePublicReply, setEnablePublicReply] = useState<boolean>(true);
  const [publicReplyText, setPublicReplyText] = useState<string>(
    'Thanks @{{username}}! Check your DM for the roadmap 👋'
  );

  const [enablePrivateDm, setEnablePrivateDm] = useState<boolean>(true);
  const [privateDmText, setPrivateDmText] = useState<string>(
    'Hey {{username}} 👋 Thanks for commenting! Here is the AI roadmap you requested: https://example.com/roadmap'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instagram/media')
      .then((res) => res.json())
      .then((data) => {
        if (data.media) {
          setMediaList(data.media);
          if (initialMediaId) {
            setSelectedMediaId(initialMediaId);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingMedia(false));
  }, [initialMediaId]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim().toUpperCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  const insertVariable = (variable: string, target: 'reply' | 'dm') => {
    if (target === 'reply') {
      setPublicReplyText((prev) => `${prev} ${variable}`);
    } else {
      setPrivateDmText((prev) => `${prev} ${variable}`);
    }
  };

  const handleSave = async (status: 'ACTIVE' | 'PAUSED' = 'ACTIVE') => {
    if (keywords.length === 0) {
      setErrorMsg('Please add at least one trigger keyword.');
      return;
    }
    if (!enablePublicReply && !enablePrivateDm) {
      setErrorMsg('Please enable at least one action (Public Reply or Private DM).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        name,
        mediaId: selectedMediaId,
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
        throw new Error(data.error || 'Failed to save automation');
      }

      router.push('/automations');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create automation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMediaObj = mediaList.find(
    (m) => (m.instagramMediaId || m.id) === selectedMediaId
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Progress Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: 'Content' },
          { num: 2, label: 'Trigger' },
          { num: 3, label: 'Actions' },
          { num: 4, label: 'Preview' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`p-3 rounded-xl border text-left transition-all ${
              step === s.num
                ? 'bg-purple-600/15 border-purple-500/40 text-purple-300 shadow-md shadow-purple-500/10'
                : step > s.num
                ? 'bg-white/5 border-white/10 text-slate-300'
                : 'bg-white/[0.02] border-white/5 text-slate-500'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider">
              Step {s.num}
            </div>
            <div className="text-sm font-semibold mt-0.5">{s.label}</div>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* STEP 1: SELECT CONTENT */}
      {step === 1 && (
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-white">Step 1 — Select Content</h2>
            <p className="text-xs text-slate-400 mt-1">
              Choose the specific Instagram Reel or Post to monitor, or apply across all content.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Automation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
              placeholder="e.g. AI Roadmap Reel"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Select Post / Reel
            </label>

            {/* Option to apply to all posts */}
            <div
              onClick={() => setSelectedMediaId(null)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedMediaId === null
                  ? 'bg-purple-600/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">All Posts & Reels</div>
                {selectedMediaId === null && <Check className="w-4 h-4 text-purple-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitors comments across any post or Reel on your connected account.
              </p>
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {mediaList.map((media) => {
                const mediaKey = media.instagramMediaId || media.id;
                const isSelected = selectedMediaId === mediaKey;
                return (
                  <div
                    key={media.id}
                    onClick={() => setSelectedMediaId(mediaKey)}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer group transition-all ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/50'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="aspect-video w-full bg-slate-900 overflow-hidden relative">
                      {media.thumbnailUrl ? (
                        <img
                          src={media.thumbnailUrl}
                          alt="Media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white">
                        {media.mediaType}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-[#0f121d]">
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {media.caption || 'Untitled Post'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 hover:opacity-95"
            >
              Continue to Trigger
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DEFINE TRIGGER */}
      {step === 2 && (
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-white">Step 2 — Define Trigger</h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure which comment keywords will activate this automation. Case-insensitive by default.
            </p>
          </div>

          {/* Keyword Input & Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Keywords (Press Enter or comma to add)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                placeholder="e.g. AI, ROADMAP, GUIDE"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-purple-600 hover:bg-purple-500 text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Keyword Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Match Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Match Rule
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'CONTAINS', title: 'Contains Keyword (Recommended)', desc: '"I want the AI roadmap" matches AI' },
                { type: 'EXACT', title: 'Exact Match', desc: 'Comment must exactly be "AI"' },
                { type: 'STARTS_WITH', title: 'Starts With', desc: '"AI guide please" matches AI' },
                { type: 'ENDS_WITH', title: 'Ends With', desc: '"Give me AI" matches AI' },
              ].map((m) => (
                <label
                  key={m.type}
                  onClick={() => setMatchType(m.type as MatchType)}
                  className={`p-3.5 rounded-xl border cursor-pointer block transition-all ${
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
                    <span className="text-sm font-semibold">{m.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 pl-5">{m.desc}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Multi-Keyword Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Multiple Keyword Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="radio"
                  name="matchMode"
                  checked={matchMode === 'ANY'}
                  onChange={() => setMatchMode('ANY')}
                  className="text-purple-600"
                />
                <span>Match ANY keyword (e.g. AI or ROADMAP)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="radio"
                  name="matchMode"
                  checked={matchMode === 'ALL'}
                  onChange={() => setMatchMode('ALL')}
                  className="text-purple-600"
                />
                <span>Match ALL keywords (e.g. AI and ROADMAP)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-white/10">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 hover:opacity-95"
            >
              Continue to Actions
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIGURE ACTIONS */}
      {step === 3 && (
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-white">Step 3 — Configure Actions</h2>
            <p className="text-xs text-slate-400 mt-1">
              Set up automated responses when a comment matches your trigger keywords.
            </p>
          </div>

          {/* Action A: Public Reply */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePublicReply}
                  onChange={(e) => setEnablePublicReply(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  Action A — Public Comment Reply
                </span>
              </label>
            </div>

            {enablePublicReply && (
              <div className="space-y-2 pt-1 pl-6">
                <textarea
                  rows={2}
                  value={publicReplyText}
                  onChange={(e) => setPublicReplyText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="e.g. Thanks @{{username}}! Check your DM for the link 👋"
                />
                {/* Variable Chips */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Insert:</span>
                  {['{{username}}', '{{comment}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, 'reply')}
                      className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 text-[11px]"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action B: Private Instagram DM */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePrivateDm}
                  onChange={(e) => setEnablePrivateDm(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-pink-400" />
                  Action B — Private Instagram Message (DM)
                </span>
              </label>
            </div>

            {enablePrivateDm && (
              <div className="space-y-2 pt-1 pl-6">
                <textarea
                  rows={3}
                  value={privateDmText}
                  onChange={(e) => setPrivateDmText(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 font-mono"
                  placeholder="e.g. Hey {{username}} 👋 Here is your link: https://example.com"
                />
                {/* Variable Chips */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Insert:</span>
                  {['{{username}}', '{{comment}}', '{{post_url}}'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v, 'dm')}
                      className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 text-[11px]"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-white/10">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 hover:opacity-95"
            >
              Preview & Activate
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & ACTIVATION */}
      {step === 4 && (
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-white">Step 4 — Preview & Activation</h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify how your automated public reply and private DM will appear to commenters.
            </p>
          </div>

          {/* Configuration Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400 block mb-1">Target Content:</span>
              <span className="font-semibold text-white">
                {selectedMediaObj ? selectedMediaObj.caption?.slice(0, 35) + '...' : 'All Posts & Reels'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400 block mb-1">Trigger Keywords:</span>
              <span className="font-semibold text-purple-300">
                {keywords.join(', ')} ({matchType})
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="text-slate-400 block mb-1">Configured Actions:</span>
              <span className="font-semibold text-white">
                {enablePublicReply && enablePrivateDm
                  ? 'Reply + DM'
                  : enablePublicReply
                  ? 'Public Reply'
                  : 'Private DM'}
              </span>
            </div>
          </div>

          {/* Visual Simulated Mock */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Live Simulation Preview
            </h3>

            {/* Simulated Instagram Comment Thread */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="text-[11px] font-semibold text-slate-400">
                Instagram Comment Thread
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-[10px]">
                  JD
                </div>
                <div>
                  <span className="font-semibold text-slate-200">jaydoe</span>{' '}
                  <span className="text-slate-300">
                    {keywords[0] || 'AI'} roadmap please!
                  </span>
                </div>
              </div>

              {enablePublicReply && (
                <div className="flex items-start gap-2.5 text-xs pl-8 border-l-2 border-purple-500/40 ml-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center font-bold text-white text-[10px]">
                    CF
                  </div>
                  <div>
                    <span className="font-semibold text-purple-300">your_account</span>{' '}
                    <span className="text-slate-200">
                      {interpolateVariables(publicReplyText, {
                        username: 'jaydoe',
                        comment: 'AI',
                        post_url: 'https://instagram.com/p/reel123',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Instagram Direct Message (DM) */}
            {enablePrivateDm && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                <div className="text-[11px] font-semibold text-slate-400">
                  Instagram Direct Message (DM) Inbox
                </div>
                <div className="flex justify-end">
                  <div className="max-w-sm p-3 rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs leading-relaxed shadow-lg">
                    {interpolateVariables(privateDmText, {
                      username: 'jaydoe',
                      comment: 'AI',
                      post_url: 'https://instagram.com/p/reel123',
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave('PAUSED')}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10"
              >
                Save as Paused
              </button>
              <button
                onClick={() => handleSave('ACTIVE')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Activating...' : 'Activate Automation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
