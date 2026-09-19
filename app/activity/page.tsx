'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Sparkles, Filter } from 'lucide-react';
import ActivityFeed from '@/components/ActivityFeed';
import WebhookSimulatorModal from '@/components/WebhookSimulatorModal';

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/activity?limit=100');
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-purple-400" />
            Activity & Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time audit log of received comment webhooks, trigger evaluations, and response deliveries.
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
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 rounded-2xl glass-card border border-white/10">
        <ActivityFeed initialLogs={logs} compact={false} />
      </div>

      <WebhookSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onSimulationComplete={fetchLogs}
      />
    </div>
  );
}
