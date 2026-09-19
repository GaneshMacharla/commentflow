'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquareShare,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Sparkles,
  Film,
  Search,
} from 'lucide-react';
import WebhookSimulatorModal from '@/components/WebhookSimulatorModal';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const loadAutomations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      if (data.automations) setAutomations(data.automations);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const endpoint = currentStatus === 'ACTIVE' ? 'pause' : 'activate';
    try {
      await fetch(`/api/automations/${id}/${endpoint}`, { method: 'POST' });
      loadAutomations();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAuto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;
    try {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      loadAutomations();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = automations.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.triggers.some((t: any) => t.keyword.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && a.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <MessageSquareShare className="w-6 h-6 text-purple-400" />
            Automations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your comment keyword triggers and automated Instagram direct messages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Test Simulator
          </button>
          <Link
            href="/automations/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {['ALL', 'ACTIVE', 'PAUSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Automations Cards */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl glass-card border border-white/10">
          <MessageSquareShare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No automations found</p>
          <p className="text-xs text-slate-500 mt-1">
            Create your first comment automation to start sending automated DMs!
          </p>
          <Link
            href="/automations/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((auto) => {
            const isActive = auto.status === 'ACTIVE';
            return (
              <div
                key={auto.id}
                className="p-5 rounded-2xl glass-card border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white text-base">{auto.name}</h3>
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

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Target:</span>
                      <span className="text-slate-200 font-medium">
                        {auto.mediaId ? `Specific Post (${auto.mediaId})` : 'All Posts & Reels'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Keywords ({auto.matchType}):</span>
                      <div className="flex flex-wrap gap-1">
                        {auto.triggers?.map((t: any) => (
                          <span
                            key={t.id}
                            className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 text-[11px] font-semibold"
                          >
                            {t.keyword}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      {auto.actions?.map((act: any) => (
                        <div
                          key={act.id}
                          className="p-2 rounded bg-black/30 border border-white/5 text-[11px] text-slate-300 font-mono"
                        >
                          <span className="text-purple-400 font-bold mr-1">
                            [{act.actionType === 'PUBLIC_REPLY' ? 'Reply' : 'DM'}]:
                          </span>
                          {act.message}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    onClick={() => toggleStatus(auto.id, auto.status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteAuto(auto.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Automation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WebhookSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onSimulationComplete={loadAutomations}
      />
    </div>
  );
}
