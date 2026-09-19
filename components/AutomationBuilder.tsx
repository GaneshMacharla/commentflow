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
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Lock,
  Heart,
  Smartphone,
  Play,
  Share2,
  Bookmark,
  Send,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { MatchType, MatchMode } from '@/lib/automation/types';
import { interpolateVariables } from '@/lib/automation/variables';

interface AutomationBuilderProps {
  initialMediaId?: string | null;
  existingAutomation?: any;
}

export type TriggerType = 'COMMENT_TO_DM' | 'STORY_REPLY' | 'KEYWORD_DM';
export type TargetContentMode = 'SPECIFIC' | 'ANY' | 'NEXT';

const SUGGESTED_KEYWORDS = [
  'LINK',
  'PRICE',
  'COURSE',
  'FREE',
  'BHEJO',
  'INFO',
  'ACCESS',
  'TOOL',
  'PROMPT',
  'GUIDE',
  'YES',
  'READY',
];

export default function AutomationBuilder({
  initialMediaId = null,
  existingAutomation = null,
}: AutomationBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  // Trigger Type Selection (ReplyKaro Core)
  const [triggerType, setTriggerType] = useState<TriggerType>('COMMENT_TO_DM');

  // Automation Name
  const [name, setName] = useState(
    existingAutomation?.name || 'ReplyKaro Comment-to-DM Lead Magnet'
  );

  // Target Content Selection
  const [targetMode, setTargetMode] = useState<TargetContentMode>(
    initialMediaId || existingAutomation?.mediaId ? 'SPECIFIC' : 'SPECIFIC'
  );
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(
    initialMediaId || existingAutomation?.mediaId || null
  );

  // Keyword Engine
  const [triggerCondition, setTriggerCondition] = useState<'KEYWORDS' | 'ANY_COMMENT'>('KEYWORDS');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(
    existingAutomation?.triggers?.map((t: any) => t.keyword) || ['LINK', 'FREE']
  );
  const [matchType, setMatchType] = useState<MatchType>(
    existingAutomation?.matchType || 'CONTAINS'
  );
  const [matchMode, setMatchMode] = useState<MatchMode>(
    existingAutomation?.matchMode || 'ANY'
  );

  // Public Reply Settings (Anti-Spam Multi-Variations)
  const [enablePublicReply, setEnablePublicReply] = useState<boolean>(true);
  const [autoLikeComment, setAutoLikeComment] = useState<boolean>(true);
  const [publicReplyVariations, setPublicReplyVariations] = useState<string[]>([
    'Sent! Check your DM 📩',
    'Check your inbox! Sent you the details 🔥',
    'Just sent it to your DMs! Check request folder if not seen 👋',
  ]);
  const [newVariationInput, setNewVariationInput] = useState('');

  // Private DM Settings (Conversion Engine)
  const [enablePrivateDm, setEnablePrivateDm] = useState<boolean>(true);
  const [privateDmText, setPrivateDmText] = useState<string>(
    'Hey {{username}} 👋 Thanks for your comment! Here is the direct link you requested:'
  );

  // Rich Link Card / CTA Button (ReplyKaro signature)
  const [enableLinkCard, setEnableLinkCard] = useState<boolean>(true);
  const [buttonTitle, setButtonTitle] = useState<string>('Get Free Access 🚀');
  const [buttonUrl, setButtonUrl] = useState<string>('https://replykaro.com');

  // ReplyKaro Follow-Gate™
  const [enableFollowGate, setEnableFollowGate] = useState<boolean>(false);
  const [followGateMessage, setFollowGateMessage] = useState<string>(
    'Hey {{username}}! Please follow @your_account first, then reply "DONE" to unlock the link!'
  );

  // Delivery Timing
  const [deliveryTiming, setDeliveryTiming] = useState<'INSTANT' | 'RANDOM_DELAY'>('INSTANT');

  // Live Simulator Test within Builder
  const [testCommentInput, setTestCommentInput] = useState('LINK');
  const [previewTab, setPreviewTab] = useState<'COMMENTS' | 'DM'>('DM');
  const [testSimulationResult, setTestSimulationResult] = useState<{
    matched: boolean;
    replyText?: string;
    dmText?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/instagram/media')
      .then((res) => res.json())
      .then((data) => {
        if (data.media && data.media.length > 0) {
          setMediaList(data.media);
          if (initialMediaId) {
            setSelectedMediaId(initialMediaId);
          } else if (!selectedMediaId) {
            setSelectedMediaId(data.media[0].instagramMediaId || data.media[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingMedia(false));
  }, [initialMediaId]);

  const addKeyword = (kwToAdd?: string) => {
    const raw = kwToAdd !== undefined ? kwToAdd : keywordInput;
    const trimmed = raw.trim().toUpperCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      if (kwToAdd === undefined) setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const addVariation = () => {
    if (newVariationInput.trim()) {
      setPublicReplyVariations([...publicReplyVariations, newVariationInput.trim()]);
      setNewVariationInput('');
    }
  };

  const removeVariation = (index: number) => {
    if (publicReplyVariations.length <= 1) return;
    setPublicReplyVariations(publicReplyVariations.filter((_, i) => i !== index));
  };

  const insertVariable = (variable: string, target: 'dm' | 'gate') => {
    if (target === 'dm') {
      setPrivateDmText((prev) => `${prev} ${variable}`);
    } else {
      setFollowGateMessage((prev) => `${prev} ${variable}`);
    }
  };

  const runTestSimulation = () => {
    const testText = testCommentInput.trim().toUpperCase();
    const isMatched =
      triggerCondition === 'ANY_COMMENT' ||
      keywords.some((kw) => {
        if (matchType === 'EXACT') return testText === kw;
        return testText.includes(kw);
      });

    if (isMatched) {
      const randomReply =
        publicReplyVariations[Math.floor(Math.random() * publicReplyVariations.length)] ||
        publicReplyVariations[0];
      setTestSimulationResult({
        matched: true,
        replyText: interpolateVariables(randomReply, {
          username: 'alex_creator',
          comment: testCommentInput,
        }),
        dmText: interpolateVariables(privateDmText, {
          username: 'alex_creator',
          comment: testCommentInput,
        }),
      });
    } else {
      setTestSimulationResult({
        matched: false,
      });
    }
  };

  const handleSave = async (status: 'ACTIVE' | 'PAUSED' = 'ACTIVE') => {
    if (triggerCondition === 'KEYWORDS' && keywords.length === 0) {
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
      // Encode multi-variations into message payload separated by |||
      const serializedPublicReply = enablePublicReply
        ? publicReplyVariations.join(' ||| ')
        : undefined;

      // Construct private message with rich CTA link if enabled
      let finalDmText = privateDmText;
      if (enableLinkCard && buttonTitle && buttonUrl) {
        finalDmText = `${privateDmText}\n\n👉 [${buttonTitle}](${buttonUrl})`;
      }
      if (enableFollowGate && followGateMessage) {
        finalDmText = `[FOLLOW_GATE: ${followGateMessage}]\n\n${finalDmText}`;
      }

      const payload = {
        name,
        mediaId: targetMode === 'SPECIFIC' ? selectedMediaId : null,
        matchType,
        matchMode,
        keywords: triggerCondition === 'ANY_COMMENT' ? ['*'] : keywords,
        publicReply: serializedPublicReply,
        privateMessage: enablePrivateDm ? finalDmText : undefined,
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
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ── Top Header & Flow Title ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3 text-pink-400" />
            ReplyKaro Automation Builder
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-extrabold text-white bg-transparent border-b border-dashed border-white/20 hover:border-purple-400 focus:border-purple-500 focus:outline-none transition-colors"
              placeholder="Name this automation..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => handleSave('PAUSED')}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('ACTIVE')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-95 disabled:opacity-60 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Publishing...' : 'Publish & Go Live'}
          </button>
        </div>
      </div>

      {/* ── Wizard Progress Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { num: 1, label: 'Trigger & Target', desc: 'Where & What' },
          { num: 2, label: 'Keyword Rules', desc: 'Matching Engine' },
          { num: 3, label: 'Actions & DMs', desc: 'Comments & Links' },
          { num: 4, label: 'Live Simulator', desc: 'Phone Preview' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`p-3 sm:p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
              step === s.num
                ? 'bg-purple-600/15 border-purple-500/50 text-purple-300 shadow-xl shadow-purple-500/10'
                : step > s.num
                ? 'bg-white/5 border-white/15 text-slate-200'
                : 'bg-white/[0.02] border-white/5 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Step {s.num}
              </span>
              {step > s.num && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <div className="text-sm font-bold mt-1 text-white">{s.label}</div>
            <div className="text-[11px] text-slate-400 hidden sm:block mt-0.5">{s.desc}</div>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <X className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: TRIGGER TYPE & CONTENT SELECTION                           */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 1. Select Trigger Type */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                Select Automation Trigger Type
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Choose the Instagram event that will trigger your automated response flow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'COMMENT_TO_DM' as TriggerType,
                  title: 'Comment to DM',
                  badge: 'Most Popular',
                  desc: 'Auto-reply to comments on Reels or Posts & send instant DMs with links.',
                  icon: MessageCircle,
                },
                {
                  id: 'STORY_REPLY' as TriggerType,
                  title: 'Story Reply & Mention',
                  badge: 'High Intent',
                  desc: 'Send an automated DM when someone replies to your story or mentions your handle.',
                  icon: Play,
                },
                {
                  id: 'KEYWORD_DM' as TriggerType,
                  title: 'Keyword DM Trigger',
                  badge: 'Direct Lead',
                  desc: 'Trigger customized responses when someone DMs your inbox with specific keywords.',
                  icon: Mail,
                },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = triggerType === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setTriggerType(t.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {t.badge}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-white mt-3">{t.title}</div>
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{t.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Target Content Mode (Specific Reel, Any Post, Next Post) */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" />
                Target Instagram Content
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select which Posts or Reels this automation will monitor.
              </p>
            </div>

            {/* Content Mode Radio Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'SPECIFIC' as TargetContentMode,
                  title: 'Specific Reel or Post',
                  desc: 'Select from your published Reels and Posts below.',
                },
                {
                  id: 'ANY' as TargetContentMode,
                  title: 'Any Post or Reel (Global)',
                  desc: 'Triggers on all existing and future content.',
                },
                {
                  id: 'NEXT' as TargetContentMode,
                  title: 'Next Reel / Post I Publish',
                  desc: 'Automatically arms for your next uploaded post.',
                },
              ].map((mode) => {
                const isSelected = targetMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTargetMode(mode.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-600/15 border-purple-500 text-white shadow-md'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{mode.title}</span>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{mode.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Media Gallery Selector (Only visible for 'SPECIFIC' mode) */}
            {targetMode === 'SPECIFIC' && (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Choose from your feed ({mediaList.length} items available)
                  </span>
                  {selectedMediaObj && (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {selectedMediaObj.mediaType || 'REEL'}
                    </span>
                  )}
                </div>

                {isLoadingMedia ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="aspect-[4/5] bg-white/5 rounded-2xl" />
                    ))}
                  </div>
                ) : mediaList.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 text-slate-400 text-xs">
                    No published media found. Connect your Instagram account or try the demo account.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                    {mediaList.map((media) => {
                      const mediaId = media.instagramMediaId || media.id;
                      const isSelected = selectedMediaId === mediaId;
                      const isReel = media.mediaType === 'VIDEO';

                      return (
                        <div
                          key={mediaId}
                          onClick={() => setSelectedMediaId(mediaId)}
                          className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all aspect-[4/5] bg-black/40 ${
                            isSelected
                              ? 'ring-3 ring-purple-500 border-purple-500 shadow-xl shadow-purple-500/25 scale-[1.02]'
                              : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <img
                            src={media.thumbnailUrl}
                            alt="Media thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                          {/* Top Badges */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            {isReel && (
                              <span className="px-2 py-0.5 rounded-md bg-pink-600/90 text-[10px] font-bold text-white flex items-center gap-1 shadow">
                                <Play className="w-2.5 h-2.5 fill-current" /> REEL
                              </span>
                            )}
                          </div>

                          {/* Selection Checkmark */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Caption Snippet */}
                          <div className="absolute bottom-2 left-2 right-2 text-[11px] text-slate-200 line-clamp-2">
                            {media.caption || 'No caption'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/20 hover:opacity-95 transition-opacity"
            >
              Continue to Keywords
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: KEYWORD MATCHING ENGINE (ReplyKaro Style)                 */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                ReplyKaro Keyword Engine
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Define the keywords commenters must type to trigger your automated public reply & private DM.
              </p>
            </div>

            {/* Trigger Condition: Specific Keywords vs Any Comment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTriggerCondition('KEYWORDS')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  triggerCondition === 'KEYWORDS'
                    ? 'bg-purple-600/15 border-purple-500 text-white'
                    : 'bg-white/[0.02] border-white/10 text-slate-400'
                }`}
              >
                <div className="font-bold text-sm text-white">Comment contains specific keywords</div>
                <div className="text-xs text-slate-400 mt-1">
                  Triggers only when comments include designated words like LINK, PRICE, FREE.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTriggerCondition('ANY_COMMENT')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  triggerCondition === 'ANY_COMMENT'
                    ? 'bg-purple-600/15 border-purple-500 text-white'
                    : 'bg-white/[0.02] border-white/10 text-slate-400'
                }`}
              >
                <div className="font-bold text-sm text-white">Any comment triggers automation</div>
                <div className="text-xs text-slate-400 mt-1">
                  Responds to every single comment regardless of what the user wrote.
                </div>
              </button>
            </div>

            {triggerCondition === 'KEYWORDS' && (
              <div className="space-y-5 pt-2">
                {/* Popular Keyword Suggestions Chips */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick-add popular creator keywords:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_KEYWORDS.map((sug) => {
                      const isAdded = keywords.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => addKeyword(sug)}
                          disabled={isAdded}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                            isAdded
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 opacity-50 cursor-not-allowed'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:border-purple-500/50'
                          }`}
                        >
                          + {sug}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Keyword Input Box */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Type a keyword and press Enter or Comma:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addKeyword();
                        }
                      }}
                      placeholder="e.g. LINK, PRICE, COURSE, BHEJO"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500 uppercase font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => addKeyword()}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                    >
                      Add Keyword
                    </button>
                  </div>
                </div>

                {/* Active Keyword Tags List */}
                <div>
                  <span className="text-xs text-slate-400 block mb-2">
                    Active trigger keywords ({keywords.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Match Sensitivity */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-white block">Match Sensitivity</span>
                    <span className="text-[11px] text-slate-400">
                      {matchType === 'CONTAINS'
                        ? 'Matches if the keyword appears anywhere in the sentence (e.g. "please send the link").'
                        : 'Matches only if the comment is exclusively the exact keyword.'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMatchType('CONTAINS')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        matchType === 'CONTAINS'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      Contains
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatchType('EXACT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        matchType === 'EXACT'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      Exact Match
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/20 hover:opacity-95"
            >
              Configure Actions & DMs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STEP 3: ACTIONS & DIRECT MESSAGES (Conversion Engine)              */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Action 1: Public Comment Reply with Anti-Spam Variations */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  Action 1: Public Reply to Comment
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reply publicly under the follower&apos;s comment to notify them and boost post engagement.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePublicReply}
                  onChange={(e) => setEnablePublicReply(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {enablePublicReply && (
              <div className="space-y-4 pt-2 border-t border-white/5">
                {/* Auto-Like Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500/30" />
                    <div>
                      <span className="text-xs font-semibold text-white">Auto-like commenter&apos;s comment</span>
                      <p className="text-[11px] text-slate-400">Instantly gives engagement feedback to the user.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoLikeComment}
                    onChange={(e) => setAutoLikeComment(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-white/10 border-white/20"
                  >
                  </input>
                </div>

                {/* Randomized Variations (Anti-Spam Engine) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Randomized Reply Variations (Anti-Spam Rotation)
                    </span>
                    <span className="text-[11px] text-purple-400">
                      Rotates randomly to prevent Meta spam filters
                    </span>
                  </div>

                  <div className="space-y-2">
                    {publicReplyVariations.map((variation, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-500 w-5 text-right">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={variation}
                          onChange={(e) => {
                            const updated = [...publicReplyVariations];
                            updated[index] = e.target.value;
                            setPublicReplyVariations(updated);
                          }}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                        {publicReplyVariations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariation(index)}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add New Variation */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newVariationInput}
                      onChange={(e) => setNewVariationInput(e.target.value)}
                      placeholder="Add another reply variation (e.g. 'Sent you the link in your DM! 🚀')"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={addVariation}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action 2: Automated Direct Message (The Conversion Engine) */}
          <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-pink-400" />
                  Action 2: Automated Direct Message (DM)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Send a personalized direct message containing your link card, guide, or offer.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePrivateDm}
                  onChange={(e) => setEnablePrivateDm(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>

            {enablePrivateDm && (
              <div className="space-y-6 pt-2 border-t border-white/5">
                {/* DM Textarea & Variables */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Message Body</label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">Insert tag:</span>
                      <button
                        type="button"
                        onClick={() => insertVariable('{{username}}', 'dm')}
                        className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25"
                      >
                        {`{{username}}`}
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={privateDmText}
                    onChange={(e) => setPrivateDmText(e.target.value)}
                    className="w-full p-4 text-xs rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-pink-500 font-sans leading-relaxed"
                    placeholder="Type your DM message..."
                  />
                </div>

                {/* ReplyKaro Rich Link Card / CTA Button */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">Attach Rich Link Card / CTA Button</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableLinkCard}
                      onChange={(e) => setEnableLinkCard(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 bg-white/10 border-white/20"
                    />
                  </div>

                  {enableLinkCard && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Button Title
                        </label>
                        <input
                          type="text"
                          value={buttonTitle}
                          onChange={(e) => setButtonTitle(e.target.value)}
                          placeholder="e.g. Get Free Access 🚀"
                          className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Destination URL
                        </label>
                        <input
                          type="url"
                          value={buttonUrl}
                          onChange={(e) => setButtonUrl(e.target.value)}
                          placeholder="https://example.com/download"
                          className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ReplyKaro Follow-Gate™ Feature */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="text-xs font-bold text-white">ReplyKaro Follow-Gate™</span>
                        <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25">
                          Follower Booster
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableFollowGate}
                      onChange={(e) => setEnableFollowGate(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 bg-white/10 border-white/20"
                    />
                  </div>

                  {enableFollowGate && (
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] text-slate-400 block">
                        Fallback message sent if commenter doesn&apos;t follow you yet:
                      </label>
                      <input
                        type="text"
                        value={followGateMessage}
                        onChange={(e) => setFollowGateMessage(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Delivery Timing */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-semibold text-white block">Delivery Timing</span>
                    <span className="text-[11px] text-slate-400">
                      {deliveryTiming === 'INSTANT'
                        ? 'Dispatched immediately (< 1 second) via Meta webhook'
                        : 'Random human-like delay (5-15s) for natural engagement'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryTiming('INSTANT')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        deliveryTiming === 'INSTANT' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryTiming('RANDOM_DELAY')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                        deliveryTiming === 'RANDOM_DELAY' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      Human Delay
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => {
                runTestSimulation();
                setStep(4);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/20 hover:opacity-95"
            >
              Preview in Phone Simulator
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STEP 4: LIVE MOBILE PHONE SIMULATOR & PUBLISH (ReplyKaro Preview)  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-200">
          {/* Left Column: Summary & Test Trigger */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl glass-card border border-white/10 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Automation Configuration Review
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Everything is configured according to ReplyKaro best practices. Test it below before publishing.
                </p>
              </div>

              {/* Summary Badges */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Trigger Type</span>
                  <span className="font-bold text-white">
                    {triggerType === 'COMMENT_TO_DM' ? 'Comment-to-DM' : triggerType}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Target Media</span>
                  <span className="font-bold text-white truncate block">
                    {targetMode === 'SPECIFIC'
                      ? selectedMediaObj?.caption?.slice(0, 25) + '...'
                      : targetMode === 'ANY'
                      ? 'All Posts & Reels'
                      : 'Next Uploaded Post'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Keywords</span>
                  <span className="font-bold text-purple-300">
                    {triggerCondition === 'ANY_COMMENT' ? 'Any comment' : keywords.join(', ')}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-slate-400 text-[11px] block">Follow-Gate™</span>
                  <span className="font-bold text-emerald-400">
                    {enableFollowGate ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* In-Builder 1-Click Test Runner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Test Trigger Live
                  </span>
                  <span className="text-[10px] text-slate-400">Simulates real commenter</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testCommentInput}
                    onChange={(e) => setTestCommentInput(e.target.value)}
                    placeholder="Type a sample comment..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={runTestSimulation}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    Test Flow
                  </button>
                </div>

                {testSimulationResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testSimulationResult.matched
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testSimulationResult.matched ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>Matched!</strong> Automation fired public comment and sent DM card.
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          <strong>No Match:</strong> Comment does not match keywords ({keywords.join(', ')}).
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSave('PAUSED')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 border border-white/10"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSave('ACTIVE')}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xl shadow-purple-500/25 hover:opacity-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isSubmitting ? 'Publishing...' : 'Publish & Go Live'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: ReplyKaro Instagram Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-[320px] sm:w-[350px] rounded-[42px] p-3.5 bg-gradient-to-b from-slate-700 via-slate-900 to-black shadow-2xl border-4 border-slate-800 relative">
              {/* Phone Camera Notch */}
              <div className="w-28 h-4 bg-black rounded-full mx-auto mb-2 relative z-10" />

              {/* Phone Screen Container */}
              <div className="rounded-[32px] bg-[#090a10] border border-white/10 overflow-hidden flex flex-col h-[560px]">
                {/* Screen Header / Instagram Tab Toggle */}
                <div className="p-3 border-b border-white/10 bg-black/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                    <button
                      onClick={() => setPreviewTab('COMMENTS')}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                        previewTab === 'COMMENTS'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Post Comments
                    </button>
                    <button
                      onClick={() => setPreviewTab('DM')}
                      className={`px-3 py-1 rounded-lg font-bold text-[10px] transition-colors ${
                        previewTab === 'DM'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Direct Message
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE</span>
                </div>

                {/* TAB 1: COMMENTS THREAD VIEW */}
                {previewTab === 'COMMENTS' && (
                  <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
                    {/* Media Header Preview */}
                    {selectedMediaObj && (
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                        <img
                          src={selectedMediaObj.thumbnailUrl}
                          alt="Thumb"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-white text-[11px] block truncate">
                            {selectedMediaObj.caption || 'Instagram Reel'}
                          </span>
                          <span className="text-[10px] text-pink-400 font-semibold">
                            {selectedMediaObj.mediaType || 'VIDEO'} · 1.4k likes
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Follower Comment */}
                    <div className="flex items-start gap-2 pt-2">
                      <div className="w-7 h-7 rounded-full bg-slate-700 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                        AC
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-white text-[11px]">alex_creator</span>{' '}
                        <span className="text-slate-300 text-[11px]">{testCommentInput || keywords[0]}</span>
                        <div className="text-[9px] text-slate-500 mt-0.5">2m ago · Reply</div>
                      </div>
                      {autoLikeComment && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 mt-1" />}
                    </div>

                    {/* Automated Public Reply */}
                    {enablePublicReply && (
                      <div className="flex items-start gap-2 pl-6 pt-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                          CF
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-purple-300 text-[11px]">your_account</span>{' '}
                          <span className="text-slate-200 text-[11px]">
                            {testSimulationResult?.replyText ||
                              interpolateVariables(publicReplyVariations[0], {
                                username: 'alex_creator',
                                comment: testCommentInput,
                              })}
                          </span>
                          <div className="text-[9px] text-slate-500 mt-0.5">Just now · Author</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DIRECT MESSAGE (DM) INBOX VIEW */}
                {previewTab === 'DM' && (
                  <div className="flex-1 p-3.5 flex flex-col justify-between overflow-y-auto text-xs">
                    {/* DM Conversation Header */}
                    <div className="text-center py-2 border-b border-white/5">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 mx-auto flex items-center justify-center text-white font-bold text-sm">
                        IG
                      </div>
                      <div className="font-bold text-white text-xs mt-1">your_account</div>
                      <div className="text-[10px] text-slate-500">Instagram · 14.8K followers</div>
                    </div>

                    {/* Messages Area */}
                    <div className="space-y-3 py-3 flex-1 flex flex-col justify-end">
                      {/* DM Bubble */}
                      <div className="self-end max-w-[85%] space-y-2">
                        <div className="p-3.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] leading-relaxed shadow-lg">
                          {testSimulationResult?.dmText ||
                            interpolateVariables(privateDmText, {
                              username: 'alex_creator',
                              comment: testCommentInput,
                            })}
                        </div>

                        {/* ReplyKaro Rich Link Card / CTA Button */}
                        {enableLinkCard && buttonTitle && (
                          <div className="rounded-xl overflow-hidden border border-purple-500/40 bg-black/60 shadow-lg">
                            <div className="p-2.5 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-b border-white/10">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-purple-300 block">
                                Resource Card
                              </span>
                              <span className="text-[11px] font-bold text-white truncate block">
                                {buttonTitle}
                              </span>
                            </div>
                            <a
                              href={buttonUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition-colors"
                            >
                              <span>{buttonTitle}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="text-[9px] text-slate-500 text-right">Delivered &lt;1s ago</div>
                      </div>
                    </div>

                    {/* DM Footer Bar */}
                    <div className="p-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Message...</span>
                      <Send className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
