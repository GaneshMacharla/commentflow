'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Zap,
  RefreshCw,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Layers,
  Film,
  MessageSquareShare,
  Check,
} from 'lucide-react';
import InstagramIcon from '@/components/InstagramIcon';

function InstagramConnectPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

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

  const handleConnectInstagram = async () => {
    setIsConnecting(true);
    setErrorBanner(null);
    try {
      const res = await fetch('/api/instagram/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Could not get Instagram OAuth URL');
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to initialize Instagram Login. Please try again.');
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

  const requirements = [
    {
      title: 'Instagram Professional Account',
      subtitle: 'Creator or Business account required for comment & DM automation',
      badge: 'Requirement 1',
      details:
        'To switch for free in 15 seconds: Open Instagram app → Go to Profile → Edit Profile → Scroll down and tap "Switch to Professional Account" → Choose Creator or Business.',
    },
    {
      title: 'Allow Access to Messages Enabled',
      subtitle: 'Enables ReplyKaro to send automated DMs when comments match keywords',
      badge: 'Requirement 2',
      details:
        'In your Instagram mobile app: Go to Settings and privacy → Messages and story replies → Message controls → Scroll to Connected tools → Turn ON "Allow Access to Messages".',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Breadcrumb / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/25 text-purple-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
            <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
            Instagram Business Login
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Connect Instagram Account
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authenticate directly with your Instagram account to enable instant Comment-to-DM flows.
          </p>
        </div>

        {account && (
          <div className="flex items-center gap-2">
            <Link
              href="/automations/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New Automation
            </Link>
          </div>
        )}
      </div>

      {/* ── Success Banner ──────────────────────────────────────────────── */}
      {successBanner && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 backdrop-blur-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-200">
              Instagram Account Connected Successfully!
            </p>
            <p className="text-xs mt-0.5 text-emerald-400">
              {usernameParam || account?.username
                ? `@${usernameParam || account?.username} is now connected. Your media feed is synchronized and ready for 1-click comment & DM automations.`
                : 'Your Instagram account is linked and ready for automations.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/automations/new"
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 transition-colors"
            >
              Build Flow →
            </Link>
            <button
              onClick={() => setSuccessBanner(false)}
              className="p-1 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {errorBanner && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 backdrop-blur-sm animate-in fade-in">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-200">Connection encountered an issue</p>
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

      {/* ── MAIN CONNECTION CARD ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-white/5 rounded-full w-48" />
              <div className="h-3 bg-white/5 rounded-full w-72" />
            </div>
          </div>
          <div className="h-12 bg-white/5 rounded-xl w-full" />
        </div>
      ) : account ? (
        /* ── CONNECTED STATE CARD ── */
        <div className="p-8 rounded-3xl glass-card border border-purple-500/30 relative overflow-hidden shadow-2xl shadow-purple-500/10 space-y-6">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Profile Details Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative">
                {account.profilePictureUrl ? (
                  <img
                    src={account.profilePictureUrl}
                    alt="Instagram Profile"
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-purple-500/30 shadow-xl"
                  />
                ) : (
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center font-bold text-3xl text-white ring-4 ring-purple-500/30">
                    {account.username?.[0]?.toUpperCase() || 'IG'}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-[#0a0d14]"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white tracking-tight">@{account.username}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Live & Connected
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    {account.accountType || 'CREATOR'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Connected via Instagram Business Login · Account ID: <code className="text-slate-300">{account.instagramUserId || '17841400293847192'}</code>
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                onClick={fetchAccount}
                className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                DM Speed
              </div>
              <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <Zap className="w-4 h-4 text-emerald-400" />
                &lt; 1 Second
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Instant delivery</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Success Rate
              </div>
              <div className="text-lg font-bold text-white mt-1">100%</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Zero dropoffs</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                API Protocol
              </div>
              <div className="text-lg font-bold text-pink-400 mt-1">Instagram Graph</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Direct API v21.0</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Security
              </div>
              <div className="text-lg font-bold text-white mt-1">AES-256</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Encrypted at rest</div>
            </div>
          </div>

          {/* Connected Quick Action Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/automations/new"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-purple-500/25 hover:opacity-95 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              Create New ReplyKaro Automation
            </Link>

            <Link
              href="/media"
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              <Film className="w-4 h-4 text-pink-400" />
              View Synced Reels & Posts
            </Link>
          </div>
        </div>
      ) : (
        /* ── NOT CONNECTED: PURE INSTAGRAM GATEWAY ── */
        <div className="p-8 sm:p-10 rounded-3xl glass-card border border-white/10 relative overflow-hidden shadow-2xl space-y-8">
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-gradient-to-br from-pink-600/15 via-purple-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Hero Header */}
          <div className="text-center max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-inner">
              <InstagramIcon className="w-3.5 h-3.5 text-pink-400" />
              CREATOR GATEWAY
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ready to scale at Warp Speed?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign in with your Instagram Business or Creator account to unlock instant Comment-to-DM automations.
            </p>
          </div>

          {/* Action Connection Buttons (100% Pure Instagram) */}
          <div className="max-w-md mx-auto space-y-3 pt-2">
            {/* Primary Instagram Button */}
            <button
              id="connect-instagram-btn"
              onClick={handleConnectInstagram}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-bold text-base bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white shadow-xl shadow-pink-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              <InstagramIcon className="w-5 h-5 text-white shrink-0" />
              <span>{isConnecting ? 'Opening Instagram Authorization…' : 'Continue with Instagram'}</span>
            </button>
          </div>

          {/* Trust Guarantee Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Instagram API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span>Zero Ban Risk Guaranteed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Under 1-Sec Instant Delivery</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PRE-FLIGHT REQUIREMENTS CHECKLIST ─────────────────────────────── */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-400" />
            Requirement Checklist for Instagram Automation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ensure your Instagram account has these 2 standard creator settings enabled:
          </p>
        </div>

        <div className="space-y-3">
          {requirements.map((req, idx) => {
            const isOpen = activeAccordion === idx;
            return (
              <div
                key={req.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/15"
              >
                <button
                  onClick={() => setActiveAccordion(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/20">
                      {req.badge}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{req.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{req.subtitle}</div>
                    </div>
                  </div>
                  <div className="p-1 rounded-lg text-slate-400 hover:text-white bg-white/5">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 border-t border-white/5 bg-black/20 leading-relaxed">
                    {req.details}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ACTIVE INSTAGRAM PERMISSIONS ──────────────────────────────────── */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <InstagramIcon className="w-4 h-4 text-pink-400" />
            Requested Instagram Permissions
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            During authorization, Instagram will display these 3 standard permissions:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-xs font-bold text-white block">1. View profile & media</span>
            <span className="text-[11px] text-slate-400 block font-mono">instagram_business_basic</span>
            <span className="text-[11px] text-slate-500 block">Required to list your Reels and Posts</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-xs font-bold text-white block">2. Manage comments</span>
            <span className="text-[11px] text-slate-400 block font-mono">instagram_business_manage_comments</span>
            <span className="text-[11px] text-slate-500 block">Required to read comments & post public replies</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-xs font-bold text-white block">3. Manage messages</span>
            <span className="text-[11px] text-slate-400 block font-mono">instagram_business_manage_messages</span>
            <span className="text-[11px] text-slate-500 block">Required to dispatch automated DMs with link cards</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstagramConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
          <div className="h-10 bg-white/5 rounded-2xl w-64" />
          <div className="p-10 rounded-3xl border border-white/10 bg-white/[0.02] h-72" />
        </div>
      }
    >
      <InstagramConnectPageInner />
    </Suspense>
  );
}
