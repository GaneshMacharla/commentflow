'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Image as ImageIcon, Heart, MessageCircle, ExternalLink, Plus } from 'lucide-react';

interface MediaCardProps {
  media: {
    id: string;
    instagramMediaId: string;
    mediaType: string;
    caption?: string;
    thumbnailUrl?: string;
    permalink?: string;
    timestamp: string;
    likeCount?: number;
    commentsCount?: number;
  };
  hasAutomation?: boolean;
}

export default function MediaCard({ media, hasAutomation }: MediaCardProps) {
  const isReel = media.mediaType === 'REEL' || media.mediaType === 'VIDEO';

  return (
    <div className="group rounded-2xl glass-card border border-white/10 overflow-hidden flex flex-col glass-card-hover">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
        {media.thumbnailUrl ? (
          <img
            src={media.thumbnailUrl}
            alt={media.caption?.slice(0, 40) || 'Instagram Media'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <Film className="w-10 h-10" />
          </div>
        )}

        {/* Media Type Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white border border-white/10">
          {isReel ? <Film className="w-3 h-3 text-pink-400" /> : <ImageIcon className="w-3 h-3 text-blue-400" />}
          <span>{media.mediaType}</span>
        </div>

        {/* Has Active Automation Indicator */}
        {hasAutomation && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 backdrop-blur-md text-white">
            ACTIVE AUTO
          </div>
        )}

        {/* External Link */}
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
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
            {media.caption || 'No caption available.'}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              {(media.likeCount || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              {(media.commentsCount || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 ml-auto">
              {new Date(media.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Link
          href={`/automations/new?mediaId=${media.instagramMediaId || media.id}`}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-purple-600 hover:text-white text-purple-300 border border-purple-500/20 hover:border-transparent transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Automation
        </Link>
      </div>
    </div>
  );
}
