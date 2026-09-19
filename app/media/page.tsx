'use client';

import React, { useState, useEffect } from 'react';
import { Film, Image as ImageIcon, Search, RefreshCw, Sparkles, Filter } from 'lucide-react';
import MediaCard from '@/components/MediaCard';

export default function MediaPage() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadMedia = async () => {
    setIsLoading(true);
    try {
      const [mediaRes, autoRes] = await Promise.all([
        fetch('/api/instagram/media').then((r) => r.json()),
        fetch('/api/automations').then((r) => r.json()),
      ]);

      if (mediaRes.media) setMediaList(mediaRes.media);
      if (autoRes.automations) setAutomations(autoRes.automations);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const filteredMedia = mediaList.filter((m) => {
    const matchesSearch =
      !search || (m.caption && m.caption.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'ALL') return true;
    if (filterType === 'REELS') return m.mediaType === 'REEL' || m.mediaType === 'VIDEO';
    if (filterType === 'IMAGES') return m.mediaType === 'IMAGE';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Film className="w-6 h-6 text-purple-400" />
            Your Posts & Reels
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Synced from your connected Instagram Professional account via Meta Graph API.
          </p>
        </div>

        <button
          onClick={loadMedia}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Sync Media
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto">
          {['ALL', 'REELS', 'IMAGES'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === t
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Posts and Reels */}
      {filteredMedia.length === 0 ? (
        <div className="py-16 text-center rounded-2xl glass-card border border-white/10">
          <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No media found</p>
          <p className="text-xs text-slate-500 mt-1">
            Make sure your Instagram Professional account has published content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
          {filteredMedia.map((media) => {
            const hasAuto = automations.some(
              (a) => a.mediaId === (media.instagramMediaId || media.id)
            );
            return (
              <MediaCard
                key={media.id}
                media={media}
                hasAutomation={hasAuto}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
