'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  Mail,
  Filter,
  User,
  ExternalLink,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  automationId?: string;
  automationName?: string;
  instagramAccountId: string;
  instagramCommentId: string;
  commenterUsername: string;
  commentText: string;
  actionType: string;
  responseContent?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface ActivityFeedProps {
  initialLogs?: ActivityItem[];
  compact?: boolean;
}

export default function ActivityFeed({ initialLogs = [], compact = false }: ActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityItem[]>(initialLogs);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredLogs = logs.filter((log) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'SENT') return log.status === 'SENT' || log.status === 'SIMULATED_SENT';
    return log.status === statusFilter;
  });

  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      case 'SIMULATED_SENT':
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Simulated
          </span>
        );
      case 'FAILED':
        return (
          <span
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30"
            title={error || 'Failed to dispatch action'}
          >
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">
            Skipped
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters (only if not compact) */}
      {!compact && (
        <div className="flex items-center gap-2 pb-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {['ALL', 'SENT', 'FAILED', 'SKIPPED'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === f
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Log Feed */}
      {filteredLogs.length === 0 ? (
        <div className="py-12 text-center rounded-2xl glass-card border border-white/10">
          <p className="text-sm text-slate-400">No activity events recorded yet.</p>
          <p className="text-xs text-slate-500 mt-1">
            Trigger a comment using the Webhook Simulator to test actions!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl glass-card border border-white/10 hover:border-white/20 transition-all text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="font-semibold text-slate-200">
                    @{log.commenterUsername}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    Comment: <span className="text-slate-200 font-medium italic">"{log.commentText}"</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(log.status, log.errorMessage)}
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Action Details */}
              <div className="flex items-start gap-2 pl-8 pt-1 text-slate-300">
                {log.actionType === 'PUBLIC_REPLY' ? (
                  <MessageCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <span className="text-[11px] font-semibold text-purple-300">
                    {log.actionType === 'PUBLIC_REPLY' ? 'Public Reply' : 'Direct Message'}
                    {log.automationName && ` (${log.automationName})`}:
                  </span>
                  <p className="mt-0.5 text-slate-200 bg-black/20 p-2 rounded border border-white/5 font-mono text-[11px]">
                    {log.responseContent || 'No response content'}
                  </p>
                  {log.errorMessage && (
                    <p className="mt-1 text-[11px] text-rose-400">
                      Reason: {log.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
