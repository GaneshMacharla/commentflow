'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquareShare,
  MessageCircle,
  Mail,
  AlertTriangle,
  Play,
  Pause,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Zap,
  Film,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import ActivityFeed from '@/components/ActivityFeed';
import WebhookSimulatorModal from '@/components/WebhookSimulatorModal';
import InstagramIcon from '@/components/InstagramIcon';
import MediaCard from '@/components/MediaCard';
import ReelAutomationSlideOver from '@/components/ReelAutomationSlideOver';

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

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    commentsDetected: 0,
    commentsMatched: 0,
    messagesSent: 0,
    failed: 0,
  });
  const [automations, setAutomations] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'ALL' | 'REELS' | 'IMAGES'>('ALL');
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Slide-over state for automating a Reel directly
  const [slideOverMedia, setSlideOverMedia] = useState<MediaItem | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);

  const handleDetectComments = async () => {
    setIsDetecting(true);
    setDetectStatus('Scanning Reels for incoming comments...');
    try {
      const res = await fetch('/api/instagram/comments/detect', { method: 'POST' });
      const data = await res.json();
      if (data.detectedCommentsCount > 0) {
        setDetectStatus(`🎉 Successfully detected ${data.detectedCommentsCount} comment(s) and executed automations!`);
      } else {
        setDetectStatus(`✅ Scanned ${data.checkedMediaCount || 0} Reel(s). System is actively listening for webhooks.`);
      }
      loadData();
    } catch (err: any) {
      setDetectStatus('❌ Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDetecting(false);
      setTimeout(() => setDetectStatus(null), 6000);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [autoRes, actRes, accRes, mediaRes] = await Promise.all([
        fetch('/api/automations').then((r) => r.json()).catch(() => ({ automations: [] })),
        fetch('/api/activity?limit=5').then((r) => r.json()).catch(() => ({ logs: [], stats: {} })),
        fetch('/api/instagram/account').then((r) => r.json()).catch(() => ({ connected: false, account: null })),
        fetch('/api/instagram/media').then((r) => r.json()).catch(() => ({ media: [] })),
      ]);

      if (autoRes.automations) setAutomations(autoRes.automations);
      if (actRes.stats) setStats(actRes.stats);
      if (actRes.logs) setRecentLogs(actRes.logs);
      if (accRes.connected && accRes.account) {
        setAccount(accRes.account);
      } else {
        setAccount(null);
      }
      if (mediaRes.media) setMediaList(mediaRes.media);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConnectInstagram = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/instagram/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to get Instagram OAuth URL');
      }
    } catch (err: any) {
      alert(err.message || 'Could not start Instagram connection');
      setIsConnecting(false);
    }
  };


  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Instagram account?')) return;
    try {
      await fetch('/api/instagram/disconnect', { method: 'POST' });
      setAccount(null);
      setMediaList([]);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const endpoint = currentStatus === 'ACTIVE' ? 'pause' : 'activate';
    try {
      await fetch(`/api/automations/${id}/${endpoint}`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error('Failed to toggle automation status:', err);
    }
  };

  const openSlideOver = (media: MediaItem) => {
    setSlideOverMedia(media);
    setSlideOverOpen(true);
  };

  const filteredMedia = mediaList.filter((m) => {
    if (mediaFilter === 'REELS') return m.mediaType === 'REEL' || m.mediaType === 'VIDEO';
    if (mediaFilter === 'IMAGES') return m.mediaType === 'IMAGE';
    return true;
  });

  // Set of media IDs that already have an automation armed
  const automatedMediaIds = new Set(
    automations.map((a) => a.mediaId).filter(Boolean)
  );

  return (
    <div className="space-y-8 pb-12">
      {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/25 text-purple-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
            <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
            ReplyKaro Architecture
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Instagram Comment Automation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Turn every Reel comment into automated DMs, clicks, and sales instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {account && (
            <button
              onClick={handleDetectComments}
              disabled={isDetecting}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600/15 hover:bg-purple-600/25 text-purple-200 border border-purple-500/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isDetecting ? 'animate-spin' : ''}`} />
              <span>{isDetecting ? 'Scanning Reels…' : 'Scan Reel Comments'}</span>
            </button>
          )}
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Live Simulator
          </button>
          <Link
            href="/automations/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Flow
          </Link>
        </div>
      </div>

      {/* Real-time Detect Comments Status Banner */}
      {detectStatus && (
        <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{detectStatus}</span>
          </div>
          <button
            onClick={() => setDetectStatus(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── NOT CONNECTED: REPLYKARO HERO GATEWAY ───────────────────────── */}
      {!isLoading && !account && (
        <div className="p-8 sm:p-10 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden shadow-2xl shadow-purple-500/10 space-y-6 animate-in fade-in">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-300 border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Instagram Setup
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Connect your Instagram account to view your Reels &amp; start automating
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              No Facebook required. Authorize directly with Instagram Business Login to sync your Reels and automatically reply to comments with personalized DMs and rich link buttons.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              id="connect-instagram-btn"
              onClick={handleConnectInstagram}
              disabled={isConnecting}
              className="flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white shadow-xl shadow-pink-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              <InstagramIcon className="w-5 h-5 text-white" />
              <span>{isConnecting ? 'Opening Instagram Login…' : 'Continue with Instagram'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Official Instagram API</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Zero Ban Risk Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>&lt; 1-Sec Instant Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquareShare className="w-4 h-4 text-pink-400 shrink-0" />
              <span>Follow-Gate™ &amp; CTA Buttons</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CONNECTED PROFILE STATUS BAR ────────────────────────────────── */}
      {account && (
        <div className="p-5 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              {account.profilePictureUrl ? (
                <img
                  src={account.profilePictureUrl}
                  alt="Profile"
                  className="w-13 h-13 rounded-full object-cover ring-2 ring-purple-500/40 shadow-lg"
                />
              ) : (
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center font-bold text-white ring-2 ring-purple-500/40 text-lg">
                  {account.username?.[0]?.toUpperCase() || 'IG'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#090a10]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-base">@{account.username}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Live &amp; Synced
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {account.accountType || 'CREATOR'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {mediaList.length} media items loaded · {automations.filter((a) => a.status === 'ACTIVE').length} automations actively firing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              title="Refresh Feed & Stats"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/automations/new"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 hover:opacity-90 transition-opacity"
            >
              + New Flow
            </Link>
            <button
              onClick={handleDisconnect}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* ── METRIC CARDS ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Comments Detected"
          value={stats.commentsDetected}
          subtitle="Processed through webhooks"
          icon={MessageCircle}
          accentColor="blue"
          trend="+14% this week"
        />
        <MetricCard
          title="Comments Matched"
          value={stats.commentsMatched}
          subtitle="Trigger keywords matched"
          icon={Sparkles}
          accentColor="purple"
          trend="+22% this week"
        />
        <MetricCard
          title="Messages Sent"
          value={stats.messagesSent}
          subtitle="Direct messages delivered"
          icon={Mail}
          accentColor="emerald"
          trend="99.8% success"
        />
        <MetricCard
          title="Delivery Failures"
          value={stats.failed}
          subtitle="Rate limits or API restrictions"
          icon={AlertTriangle}
          accentColor={stats.failed > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* ── FEED-FIRST: INSTAGRAM REELS & POSTS SECTION ─────────────────── */}
      {account && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-pink-400" />
                Select a Reel to Automate
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click "Create Automation" on any Reel below to configure trigger keywords and automatic DMs.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto">
              {(['ALL', 'REELS', 'IMAGES'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setMediaFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    mediaFilter === filter
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter === 'ALL' ? 'All Content' : filter === 'REELS' ? '🎬 Reels' : '📷 Posts'}
                </button>
              ))}
            </div>
          </div>

          {filteredMedia.length === 0 ? (
            <div className="p-8 text-center rounded-2xl glass-card border border-white/10 text-slate-400 text-sm">
              No media found. Click "Refresh" to sync your latest Instagram posts.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMedia.slice(0, 6).map((media) => {
                const mediaId = media.instagramMediaId || media.id;
                const isAutomated = automatedMediaIds.has(mediaId);
                return (
                  <MediaCard
                    key={media.id}
                    media={media}
                    hasAutomation={isAutomated}
                    onCreateAutomation={openSlideOver}
                  />
                );
              })}
            </div>
          )}

          {mediaList.length > 6 && (
            <div className="text-center pt-2">
              <Link
                href="/media"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                View all {mediaList.length} Reels &amp; Posts
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVE AUTOMATIONS & ACTIVITY GRID ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Automations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquareShare className="w-5 h-5 text-purple-400" />
              Active Automations
            </h2>
            <Link
              href="/automations"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              View all ({automations.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {automations.length === 0 ? (
            <div className="p-8 text-center rounded-2xl glass-card border border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                <Zap className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">No automations created yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pick a Reel from the grid above or click "Create Flow" to arm your first Comment-to-DM trigger!
              </p>
              <Link
                href="/automations/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Automation
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((auto) => {
                const isActive = auto.status === 'ACTIVE';
                return (
                  <div
                    key={auto.id}
                    className="p-5 rounded-2xl glass-card border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-white text-sm">{auto.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {auto.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>Keywords:</span>
                        <span className="font-semibold text-purple-300">
                          {auto.triggers?.map((t: any) => t.keyword).join(', ')}
                        </span>
                        <span>•</span>
                        <span>Actions:</span>
                        <span className="text-slate-300">
                          {auto.actions?.length > 1
                            ? 'Public Reply + DM'
                            : auto.actions?.[0]?.actionType === 'PUBLIC_REPLY'
                            ? 'Public Reply'
                            : 'Private DM'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => toggleStatus(auto.id, auto.status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isActive
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Activate
                          </>
                        )}
                      </button>
                      <Link
                        href={`/automations/${auto.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Live Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
            <Link
              href="/activity"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Full Log
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ActivityFeed initialLogs={recentLogs} compact={true} />
        </div>
      </div>

      {/* ── SLIDE-OVER DRAWER FOR DIRECT REEL AUTOMATION ────────────────── */}
      <ReelAutomationSlideOver
        media={slideOverMedia}
        isOpen={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onSaved={loadData}
      />

      {/* ── WEBHOOK SIMULATOR MODAL ─────────────────────────────────────── */}
      <WebhookSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onSimulationComplete={loadData}
      />
    </div>
  );
}
