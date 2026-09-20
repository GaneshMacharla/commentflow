import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — CommentFlow',
  description: 'Privacy Policy for CommentFlow Instagram Automation',
};

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Last updated: September 20, 2026
          </p>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">1. Introduction</h2>
          <p>
            CommentFlow (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides an automated engagement and direct messaging tool designed for creators and businesses using official Meta and Instagram Graph APIs. We are committed to protecting your privacy and your followers&apos; privacy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">2. Information We Collect</h2>
          <p>When you use CommentFlow, we process the following categories of data:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>
              <strong className="text-slate-200">Instagram Account Data:</strong> User ID, username, profile picture, account type, and encrypted access tokens required to perform automations on your behalf.
            </li>
            <li>
              <strong className="text-slate-200">Engagement &amp; Webhook Data:</strong> Public comment IDs, public comment text, and commenter usernames on your media posts and Reels needed to evaluate trigger rules and dispatch automated responses.
            </li>
            <li>
              <strong className="text-slate-200">Activity Logs:</strong> Timestamps, automation match statuses, and message delivery audit logs to display analytics on your dashboard.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">3. How We Use Information</h2>
          <p>We use the data collected strictly for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>To monitor public comments on your authorized Instagram posts and Reels.</li>
            <li>To dispatch keyword-matched public replies and automated direct messages that you configure.</li>
            <li>To prevent duplicate actions using cryptographic idempotency mechanisms.</li>
            <li>To display engagement metrics and audit logs within your CommentFlow dashboard.</li>
          </ul>
          <p>We do NOT sell, rent, or monetize your personal data or your followers&apos; data to any third parties.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">4. Data Storage &amp; Security</h2>
          <p>
            All access tokens are encrypted using industry-standard AES-256-GCM encryption before storage. Database access is strictly governed by authenticated sessions and Row Level Security (RLS).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">5. User Data Deletion Instructions</h2>
          <p>
            You may request complete deletion of your account and all associated data at any time:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>
              <strong className="text-slate-200">Instant Disconnect:</strong> Click &quot;Disconnect Account&quot; inside the CommentFlow dashboard to immediately revoke access tokens and wipe stored credentials.
            </li>
            <li>
              <strong className="text-slate-200">Data Deletion Request:</strong> Contact us at{' '}
              <span className="text-purple-400">ganimacharla2004@gmail.com</span> with your Instagram handle to have all historical activity logs and media references permanently expunged within 48 hours.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">6. Third-Party Services</h2>
          <p>
            Our service interfaces with Meta Platforms, Inc. (Instagram Graph API). Your use of Instagram features is also subject to Meta&apos;s Terms of Service and Privacy Policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white">7. Contact Us</h2>
          <p>
            If you have questions regarding this Privacy Policy, contact us at{' '}
            <span className="text-purple-400">ganimacharla2004@gmail.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
}
