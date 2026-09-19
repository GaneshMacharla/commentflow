import React from 'react';
import { getAutomationById } from '@/lib/supabase/db';
import AutomationBuilder from '@/components/AutomationBuilder';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AutomationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const automation = await getAutomationById(id);

  if (!automation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/automations"
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Automation: {automation.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Status: <span className="font-semibold text-purple-300">{automation.status}</span> • Created on {new Date(automation.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <AutomationBuilder existingAutomation={automation} initialMediaId={automation.mediaId} />
    </div>
  );
}
