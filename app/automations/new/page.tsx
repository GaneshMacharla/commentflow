'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AutomationBuilder from '@/components/AutomationBuilder';

function BuilderWrapper() {
  const searchParams = useSearchParams();
  const mediaId = searchParams.get('mediaId');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Create Automation</h1>
        <p className="text-xs text-slate-400 mt-1">
          Set up keyword-triggered public comments and private direct messages on Instagram.
        </p>
      </div>

      <AutomationBuilder initialMediaId={mediaId} />
    </div>
  );
}

export default function NewAutomationPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 py-12 text-center text-sm">Loading builder...</div>}>
      <BuilderWrapper />
    </Suspense>
  );
}
