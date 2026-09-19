'use client';

import React from 'react';
import {
  Film,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  ExternalLink,
  Zap,
  CheckCircle2,
} from 'lucide-react';

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

interface MediaCardProps {
  media: MediaItem;
  hasAutomation?: boolean;
  onCreateAutomation?: (media: MediaItem) => void;
}

export default function MediaCard({ media, hasAutomation, onCreateAutomation }: MediaCardProps) {
  const isReel = media.mediaType === 'REEL' || media.mediaType === 'VIDEO';

  return (
    <div
      className={`group rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 bg-[#0f121d] hover:bg-[#12162a] ${
        hasAutomation
          ? 'border-emerald-500/30 shadow-sm shadow-emerald-500/10 hover:border-emerald-500/50'
          : 'border-white/10 hover:border-purple-500/30 hover:shadow-sm hover:shadow-purple-500/10'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
        {media.thumbnailUrl ? (
          <img
            src={media.thumbnailUrl}
            alt={media.caption?.slice(0, 40) || 'Instagram Media'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700">
            {isReel ? (
              <Film className="w-10 h-10" />
            ) : (
              <ImageIcon className="w-10 h-10" />
            )}
          </div>
        )}

        {/* Gradient overlay for reels */}
        {isReel && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        )}

        {/* Media Type Badge */}
        <div
          className={`absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold backdrop-blur-md border ${
            isReel
              ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white border-purple-500/30'
              : 'bg-black/60 text-white border-white/10'
          }`}
        >
          {isReel ? (
            <Film className="w-3 h-3" />
          ) : (
            <ImageIcon className="w-3 h-3 text-blue-400" />
          )}
          <span>{media.mediaType}</span>
        </div>

        {/* Has Active Automation Badge */}
        {hasAutomation && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 backdrop-blur-md text-white border border-emerald-400/30">
            <CheckCircle2 className="w-2.5 h-2.5" />
            ACTIVE AUTO
          </div>
        )}

        {/* External Link (hover only) */}
        {media.permalink && (
          <a
            href={media.permalink}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="View on Instagram"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Content Info */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
            {media.caption || <span className="text-slate-500 italic">No caption</span>}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2.5">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              {(media.likeCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              {(media.commentsCount || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-600 ml-auto">
              {new Date(media.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          id={`create-automation-${media.instagramMediaId || media.id}`}
          onClick={() => onCreateAutomation?.(media)}
          className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
            hasAutomation
              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 hover:border-emerald-500/50'
              : 'bg-white/5 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 text-purple-300 hover:text-white border border-purple-500/20 hover:border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {hasAutomation ? 'Edit Automation' : 'Create Automation'}
        </button>
      </div>
    </div>
  );
}
