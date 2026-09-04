'use client';

import { useEffect, useState } from 'react';
import { Download, Mail, ArrowRight } from 'lucide-react';
import { SuccessCard } from '@/components/success-card';

export default function ProSuccessPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight flex items-center justify-center px-6 py-20">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[120px]" />
      </div>
      <div className={`relative z-10 w-full max-w-2xl ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
        <div className="mb-8 flex items-center justify-center">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-16 w-auto object-contain" />
        </div>
        <SuccessCard
          title="Investor Report Pro Unlocked"
          message="Your Pro upgrade is confirmed. Your full investor analysis will be included in your report delivery."
          steps={[
            'Your standard report remains in the AI analysis queue.',
            'Investor Report Pro is now attached to your submission.',
            'Both reports will be delivered to your email within 24 hours.',
          ]}
          accent="gold"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="glass-gold flex items-center gap-4 rounded-2xl p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 ring-1 ring-gold-500/20">
              <Download className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">PDF Report</h3>
              <p className="text-xs text-white/50">Your branded PDF will be available for download once generated.</p>
            </div>
          </div>
          <div className="glass-gold flex items-center gap-4 rounded-2xl p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 ring-1 ring-gold-500/20">
              <Mail className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Email Delivery</h3>
              <p className="text-xs text-white/50">Confirmation and report link sent to your email address.</p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-4">
          <a href="/report/sample" className="group inline-flex items-center gap-2 rounded-xl glass px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/5">
            Preview Sample Report
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a href="/" className="text-sm text-white/40 transition-colors hover:text-white">
            Analyze Another Property
          </a>
        </div>
      </div>
    </main>
  );
}
