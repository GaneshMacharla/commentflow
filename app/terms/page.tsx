import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — CommentFlow',
  description: 'Terms of Service for CommentFlow Instagram Automation',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8 text-slate-300">
      <div className="border-b border-white/10 pb-6 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CommentFlow
          </Link>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            Terms of Service
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Last updated: September 20, 2026
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Agreement to Terms</h2>
          <p>
            By accessing or using CommentFlow, you agree to be bound by these Terms of Service and comply with all Meta Platforms developer policies and Instagram Community Guidelines.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Acceptable Use Policy</h2>
          <p>You agree not to use CommentFlow to:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Send unsolicited spam, deceptive messages, or violate Meta&apos;s anti-spam rules.</li>
            <li>Harass, abuse, or impersonate other Instagram creators or users.</li>
            <li>Promote illegal goods, counterfeit materials, or unauthorized solicitations.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. Meta API Compliance</h2>
          <p>
            CommentFlow operates exclusively using official Meta Graph APIs. We maintain rate limits, standard response windows, and human-like delays to ensure compliance with Meta policies.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Disclaimer of Warranties</h2>
          <p>
            CommentFlow is provided &quot;as is&quot; without warranty of any kind. We are not liable for any changes to third-party API availability, account suspensions caused by misuse, or connectivity interruptions.
          </p>
        </section>
      </div>
    </div>
  );
}
