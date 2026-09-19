'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  accentColor?: 'purple' | 'blue' | 'emerald' | 'rose' | 'amber';
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'purple',
}: MetricCardProps) {
  const accentStyles = {
    purple: {
      bg: 'from-purple-500/10 to-transparent',
      border: 'hover:border-purple-500/30',
      iconBg: 'bg-purple-500/15 text-purple-400',
    },
    blue: {
      bg: 'from-blue-500/10 to-transparent',
      border: 'hover:border-blue-500/30',
      iconBg: 'bg-blue-500/15 text-blue-400',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-transparent',
      border: 'hover:border-emerald-500/30',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
    },
    rose: {
      bg: 'from-rose-500/10 to-transparent',
      border: 'hover:border-rose-500/30',
      iconBg: 'bg-rose-500/15 text-rose-400',
    },
    amber: {
      bg: 'from-amber-500/10 to-transparent',
      border: 'hover:border-amber-500/30',
      iconBg: 'bg-amber-500/15 text-amber-400',
    },
  }[accentColor];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl glass-card p-5 border border-white/10 ${accentStyles.border} transition-all duration-200 group`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${accentStyles.bg} rounded-full blur-2xl pointer-events-none`} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentStyles.iconBg} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span className="text-xs font-medium text-emerald-400">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
