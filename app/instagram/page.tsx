'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import InstagramIcon from '@/components/InstagramIcon';

export default function InstagramConnectPage() {
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchAccount = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/instagram/account');
      const data = await res.json();
      if (data.connected && data.account) {
        setAccount(data.account);
      } else {
        setAccount(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const handleConnectMeta = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch('/api/instagram/connect');
      const data = await res.json();
      if (data.url) {
        // Redirect to Meta OAuth consent dialog
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      alert('Failed to initialize Meta OAuth');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Instagram account?')) return;
    try {
      await fetch('/api/instagram/disconnect', { method: 'POST' });
      setAccount(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <InstagramIcon className="w-6 h-6 text-pink-500" />
          Instagram Account Connection
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect your Instagram Professional (Business or Creator) account via Meta Graph API OAuth.
        </p>
      </div>

      {/* Account Status Card */}
      <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={account?.profilePictureUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt="Avatar"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-500/40"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#090a10]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  @{account?.username || 'creator_studio'}
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Account Type: <span className="text-purple-300 font-semibold">{account?.accountType || 'CREATOR'}</span> • ID: <code className="text-slate-300">{account?.instagramUserId || '17841400008460056'}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={fetchAccount}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Security & Token Guarantee */}
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-purple-200">Security Guarantee (Rule 1 & 3):</span>
            <p className="text-slate-300 leading-relaxed">
              Access tokens are encrypted at rest using <strong>AES-256-GCM</strong>. Sensitive credentials and secret keys are stored exclusively server-side and are never exposed to the client browser. No passwords are ever requested or stored.
            </p>
          </div>
        </div>

        {/* Meta Permissions Checklist */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Meta Permissions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {[
              { label: 'instagram_basic', desc: 'Read basic profile and media' },
              { label: 'instagram_manage_comments', desc: 'Read and post public replies to comments' },
              { label: 'instagram_manage_messages', desc: 'Send private direct messages' },
              { label: 'pages_read_engagement', desc: 'Verify business page engagement events' },
            ].map((p) => (
              <div
                key={p.label}
                className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <code className="font-semibold text-white">{p.label}</code>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connect New Account Button */}
        <div className="pt-2">
          <button
            onClick={handleConnectMeta}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/20 hover:opacity-95 transition-opacity"
          >
            <InstagramIcon className="w-4 h-4" />
            {isConnecting ? 'Opening Meta OAuth...' : 'Reconnect or Switch Instagram Account (Meta OAuth)'}
          </button>
        </div>
      </div>

      {/* Webhook Configuration Guide */}
      <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Meta App Webhook Configuration
        </h3>
        <p className="text-slate-300">
          In your Meta App Dashboard under <strong>Instagram Graph API &gt; Webhooks</strong>, configure:
        </p>
        <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[11px]">
          <div>
            <span className="text-slate-500">Callback URL: </span>
            <span className="text-purple-300">https://your-domain.vercel.app/api/webhooks/instagram</span>
          </div>
          <div>
            <span className="text-slate-500">Verify Token: </span>
            <span className="text-amber-300">commentflow_meta_verify_token_2026</span>
          </div>
          <div>
            <span className="text-slate-500">Subscription Field: </span>
            <span className="text-emerald-300">comments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
