'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import ActivityFeed from '@/components/ActivityFeed';
import WebhookSimulatorModal from '@/components/WebhookSimulatorModal';
import InstagramIcon from '@/components/InstagramIcon';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    commentsDetected: 0,
    commentsMatched: 0,
    messagesSent: 0,
    failed: 0,
  });
  const [automations, setAutomations] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [autoRes, actRes, accRes] = await Promise.all([
        fetch('/api/automations').then((r) => r.json()),
        fetch('/api/activity?limit=5').then((r) => r.json()),
        fetch('/api/instagram/account').then((r) => r.json()),
      ]);

      if (autoRes.automations) setAutomations(autoRes.automations);
      if (actRes.stats) setStats(actRes.stats);
      if (actRes.logs) setRecentLogs(actRes.logs);
      if (accRes.account) setAccount(accRes.account);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const endpoint = currentStatus === 'ACTIVE' ? 'pause' : 'activate';
    try {
      await fetch(`/api/automations/${id}/${endpoint}`, { method: 'POST' });
      loadData();
    } catch (err) {
      console.error('Failed to toggle automation status:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Instagram Comment Automation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Official Meta Graph API comment triggers, public replies, and automated DMs for your Reels & Posts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Live Simulator
          </button>
          <Link
            href="/automations/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
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
          subtitle="Direct messages & replies delivered"
          icon={Mail}
          accentColor="emerald"
          trend="99.2% success"
        />
        <MetricCard
          title="Delivery Failures"
          value={stats.failed}
          subtitle="Rate limits or API restrictions"
          icon={AlertTriangle}
          accentColor={stats.failed > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Connected Account & Quick Status */}
      <div className="p-5 rounded-2xl glass-card border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {account ? (
          <div className="flex items-center gap-3.5">
            <div className="relative">
              {account.profilePictureUrl ? (
                <img
                  src={account.profilePictureUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300 ring-2 ring-purple-500/40">
                  {account.username?.[0]?.toUpperCase() || 'IG'}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#090a10]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">
                  @{account.username}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {account.accountType || 'PROFESSIONAL'} ACCOUNT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connected via Meta Graph API • Tokens encrypted at rest (AES-256-GCM)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
              <InstagramIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <span className="font-bold text-white text-base">
                No Instagram Account Connected
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your Instagram Professional account to start automating comments & DMs.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {account ? (
            <>
              <Link
                href="/media"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
              >
                Browse Posts & Reels
              </Link>
              <Link
                href="/instagram"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30"
              >
                Manage Connection
              </Link>
            </>
          ) : (
            <Link
              href="/instagram"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20 hover:opacity-90"
            >
              Connect Instagram
            </Link>
          )}
        </div>
      </div>

      {/* Main Content Grid: Automations & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Active Automations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquareShare className="w-5 h-5 text-purple-400" />
              Automations
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
            <div className="p-8 text-center rounded-2xl glass-card border border-white/10 space-y-2">
              <p className="text-sm font-semibold text-slate-300">No automations created yet</p>
              <p className="text-xs text-slate-500">
                Click "Create Automation" to set up your first comment keyword trigger!
              </p>
              <Link
                href="/automations/new"
                className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Automation
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
                        <span className="font-bold text-white text-sm">
                          {auto.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-badge-active'
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

      {/* Webhook Simulator Modal */}
      <WebhookSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onSimulationComplete={loadData}
      />
    </div>
  );
}
