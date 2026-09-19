'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Film,
  Image as ImageIcon,
  Search,
  RefreshCw,
  Zap,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import MediaCard from '@/components/MediaCard';
import ReelAutomationSlideOver from '@/components/ReelAutomationSlideOver';
import InstagramIcon from '@/components/InstagramIcon';

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

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0f121d] animate-pulse">
      <div className="aspect-video w-full bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-white/5 rounded-full w-3/4" />
        <div className="h-3 bg-white/5 rounded-full w-1/2" />
        <div className="flex gap-3 pt-1">
          <div className="h-3 bg-white/5 rounded-full w-12" />
          <div className="h-3 bg-white/5 rounded-full w-12" />
        </div>
        <div className="h-8 bg-white/5 rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

export default function MediaPage() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null); // null = unknown yet
  const [connectedAccount, setConnectedAccount] = useState<any>(null);

  // Slide-over state
  const [slideOverMedia, setSlideOverMedia] = useState<MediaItem | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  const loadMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mediaRes, autoRes] = await Promise.all([
        fetch('/api/instagram/media').then((r) => r.json()),
        fetch('/api/automations').then((r) => r.json()),
      ]);

      if (mediaRes.connected === false) {
        setIsConnected(false);
        setMediaList([]);
      } else {
        setIsConnected(true);
        setConnectedAccount(mediaRes.account || null);
        if (mediaRes.media) setMediaList(mediaRes.media);
      }

      if (autoRes.automations) setAutomations(autoRes.automations);
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const openSlideOver = (media: MediaItem) => {
    setSlideOverMedia(media);
    setSlideOverOpen(true);
  };

  const closeSlideOver = () => {
    setSlideOverOpen(false);
  };

  const handleAutomationSaved = () => {
    // Refresh automations list so badges update
    fetch('/api/automations')
      .then((r) => r.json())
      .then((data) => {
        if (data.automations) setAutomations(data.automations);
      })
      .catch(() => {});
  };

  const filteredMedia = mediaList.filter((m) => {
    const matchesSearch =
      !search || (m.caption && m.caption.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterType === 'ALL') return true;
    if (filterType === 'REELS') return m.mediaType === 'REEL' || m.mediaType === 'VIDEO';
    if (filterType === 'IMAGES') return m.mediaType === 'IMAGE';
    return true;
  });

  const reelCount = mediaList.filter(
    (m) => m.mediaType === 'REEL' || m.mediaType === 'VIDEO'
  ).length;
  const imageCount = mediaList.filter((m) => m.mediaType === 'IMAGE').length;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Film className="w-6 h-6 text-purple-400" />
              Your Posts &amp; Reels
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Synced from your connected Instagram Professional account via Meta Graph API.
            </p>
          </div>

          <button
            id="sync-media-btn"
            onClick={loadMedia}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 self-start sm:self-auto disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Media
          </button>
        </div>

        {/* Not Connected State */}
        {!isLoading && isConnected === false && (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] text-center gap-4 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-pink-600/20 border border-purple-500/20 flex items-center justify-center">
              <InstagramIcon className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">No Instagram Account Connected</h2>
              <p className="text-sm text-slate-400 max-w-sm">
                Connect your Instagram Professional or Creator account to see your posts and reels
                here, and start setting up comment automations.
              </p>
            </div>
            <Link
              href="/instagram"
              id="connect-instagram-cta"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/20 hover:opacity-95 transition-opacity"
            >
              <InstagramIcon className="w-4 h-4" />
              Connect Instagram Account
            </Link>
          </div>
        )}

        {/* Connected: Filter/Search & Grid */}
        {(isLoading || isConnected === true) && (
          <>
            {/* Connected Account Banner */}
            {!isLoading && connectedAccount && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <p className="text-xs text-emerald-300 font-medium">
                  Connected as{' '}
                  <span className="font-bold text-white">@{connectedAccount.username}</span> ·{' '}
                  <span className="text-slate-400">
                    {mediaList.length} items synced ({reelCount} reels, {imageCount} images)
                  </span>
                </p>
                <Link
                  href="/instagram"
                  className="ml-auto text-[11px] text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                >
                  Manage →
                </Link>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="media-search-input"
                  type="text"
                  placeholder="Search captions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {[
                  { key: 'ALL', label: `All (${mediaList.length})` },
                  { key: 'REELS', label: `Reels (${reelCount})` },
                  { key: 'IMAGES', label: `Images (${imageCount})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    id={`filter-${t.key.toLowerCase()}-btn`}
                    onClick={() => setFilterType(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterType === t.key
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-white/10 bg-white/[0.01]">
                {search || filterType !== 'ALL' ? (
                  <>
                    <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-300">No results found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try a different search term or filter.
                    </p>
                    <button
                      onClick={() => {
                        setSearch('');
                        setFilterType('ALL');
                      }}
                      className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </>
                ) : (
                  <>
                    <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-300">No media found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Make sure your Instagram Professional account has published content, then sync.
                    </p>
                    <button
                      onClick={loadMedia}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync Media
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Create Automation Tip */}
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    Click{' '}
                    <span className="text-purple-300 font-semibold">Create Automation</span> on any
                    reel or post to set up keyword triggers, auto-replies, and DMs — all without
                    leaving this page.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {filteredMedia.map((media) => {
                    const hasAuto = automations.some(
                      (a) => a.mediaId === (media.instagramMediaId || media.id)
                    );
                    return (
                      <MediaCard
                        key={media.id}
                        media={media}
                        hasAutomation={hasAuto}
                        onCreateAutomation={openSlideOver}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Reel Automation Slide-Over Panel */}
      <ReelAutomationSlideOver
        media={slideOverMedia}
        isOpen={slideOverOpen}
        onClose={closeSlideOver}
        onSaved={handleAutomationSaved}
      />
    </>
  );
}
