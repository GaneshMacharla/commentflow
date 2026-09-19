'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquareShare,
  Layers,
  Film,
  Activity,
  Sparkles,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import WebhookSimulatorModal from './WebhookSimulatorModal';

export default function Navbar() {
  const pathname = usePathname();
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/instagram/account')
      .then((res) => res.json())
      .then((data) => {
        if (data.connected && data.account) {
          setAccount(data.account);
        }
      })
      .catch(() => {});
  }, []);

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Layers },
    { href: '/automations', label: 'Automations', icon: MessageSquareShare },
    { href: '/media', label: 'Posts & Reels', icon: Film },
    { href: '/activity', label: 'Activity Logs', icon: Activity },
    { href: '/instagram', label: 'Instagram Account', icon: InstagramIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090a10]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-400 p-[1.5px] shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200">
                  <div className="w-full h-full bg-[#0d1017] rounded-[10px] flex items-center justify-center">
                    <MessageSquareShare className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
                    CommentFlow
                  </span>
                  <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    MVP v1.0
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Simulator Button */}
              <button
                onClick={() => setSimulatorOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25 hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Test Simulator
              </button>

              {/* Connected IG Account Badge */}
              <Link
                href="/instagram"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-xs text-slate-300"
              >
                {account?.username ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-medium text-slate-200">
                      @{account.username}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span className="text-slate-400">Connect IG</span>
                  </>
                )}
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setSimulatorOpen(true)}
                className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30"
                title="Test Simulator"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0c0f18] px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-purple-600/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Webhook Simulator Modal */}
      <WebhookSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
      />
    </>
  );
}
