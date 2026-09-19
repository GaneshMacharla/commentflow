'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lock,
  ShieldCheck,
  Zap,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react';
import InstagramIcon from '@/components/InstagramIcon';

function InstagramConnectPageInner() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Banners from OAuth callback redirect
  const connectedParam = searchParams.get('connected');
  const errorParam = searchParams.get('error');
  const usernameParam = searchParams.get('username');
  const [successBanner, setSuccessBanner] = useState(connectedParam === 'true');
  const [errorBanner, setErrorBanner] = useState<string | null>(
    errorParam ? decodeURIComponent(errorParam) : null
  );

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
    setErrorBanner(null);
    try {
      const res = await fetch('/api/instagram/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not get OAuth URL');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to initialize Meta OAuth. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this Instagram account?')) return;
    try {
      await fetch('/api/instagram/disconnect', { method: 'POST' });
      setAccount(null);
      setSuccessBanner(false);
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

      {/* ── Success Banner ──────────────────────────────────────────────── */}
      {successBanner && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-200">
              Instagram account connected successfully!
            </p>
            <p className="text-xs mt-0.5 text-emerald-400">
              {usernameParam
                ? `@${usernameParam} is now linked. Head to Posts & Reels to see your feed.`
                : 'Your account is now linked and ready for automations.'}
            </p>
          </div>
          <button
            onClick={() => setSuccessBanner(false)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {errorBanner && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-200">Connection failed</p>
            <p className="text-xs mt-0.5 text-rose-400 leading-relaxed">{errorBanner}</p>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="p-1 rounded-lg hover:bg-rose-500/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Account Status Card ──────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-4 pb-4 border-b border-white/10">
            <div className="w-14 h-14 rounded-full bg-white/5 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-white/5 rounded-full w-32 animate-pulse" />
              <div className="h-3 bg-white/5 rounded-full w-48 animate-pulse" />
            </div>
          </div>
        ) : account ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative">
                {account.profilePictureUrl ? (
                  <img
                    src={account.profilePictureUrl}
                    alt="Avatar"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-500/40"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-2xl text-purple-300 ring-2 ring-purple-500/40">
                    {account.username?.[0]?.toUpperCase() || 'IG'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#090a10]" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">@{account.username}</h2>
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Account Type:{' '}
                  <span className="text-purple-300 font-semibold">
                    {account.accountType || 'PROFESSIONAL'}
                  </span>{' '}
                  • ID: <code className="text-slate-300">{account.instagramUserId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={fetchAccount}
                id="refresh-account-btn"
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-colors"
                title="Refresh status"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleDisconnect}
                id="disconnect-btn"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <InstagramIcon className="w-7 h-7 text-slate-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">No Account Connected</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect your Instagram Professional or Creator account via Meta OAuth.
                </p>
              </div>
            </div>
            <button
              onClick={fetchAccount}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-colors"
              title="Check connection"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Security Note */}
        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-purple-200">Security Guarantee:</span>
            <p className="text-slate-300 leading-relaxed">
              Access tokens are encrypted at rest using <strong>AES-256-GCM</strong>. Sensitive
              credentials are stored exclusively server-side and are never exposed to the browser. No
              passwords are ever requested or stored.
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

        {/* Connect Button */}
        <div className="pt-2">
          <button
            id="connect-meta-oauth-btn"
            onClick={handleConnectMeta}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/20 hover:opacity-95 transition-opacity disabled:opacity-60"
          >
            <InstagramIcon className="w-4 h-4" />
            {isConnecting
              ? 'Opening Meta OAuth…'
              : account
              ? 'Reconnect or Switch Instagram Account (Meta OAuth)'
              : 'Connect Instagram Account (Meta OAuth)'}
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
          In your Meta App Dashboard under{' '}
          <strong>Instagram Graph API &gt; Webhooks</strong>, configure:
        </p>
        <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[11px]">
          <div>
            <span className="text-slate-500">Callback URL: </span>
            <span className="text-purple-300">
              {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}
              /api/webhooks/instagram
            </span>
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
        <a
          href="https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/getting-started"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Meta Developer Docs — Instagram Graph API
        </a>
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function InstagramConnectPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded-full w-64" />
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.02] h-64" />
      </div>
    }>
      <InstagramConnectPageInner />
    </Suspense>
  );
}
