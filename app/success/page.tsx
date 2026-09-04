'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Building2 } from 'lucide-react';
import { SuccessCard } from '@/components/success-card';

export default function SuccessPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight flex items-center justify-center px-6 py-20">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>
      <div className={`relative z-10 w-full max-w-2xl ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-400 shadow-[0_0_20px_rgba(14,165,164,0.3)]">
            <Building2 className="h-5 w-5 text-midnight-900" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            EiX<span className="text-teal-400"> Concierge Engine</span>
            <sup className="ml-0.5 text-[10px] text-teal-400/70">™</sup>
          </span>
        </div>
        <SuccessCard
          title="Payment Received"
          message="Your EiX Property Score™ request has been received. Your property is now in our AI analysis queue."
          steps={[
            'Your property enters our AI analysis queue.',
            'We review investment potential, yield, and risk.',
            "You'll receive your report within 24 hours.",
          ]}
          accent="teal"
        />
        <div className="mt-8 text-center">
          <a href="/upsell/pro" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 px-8 py-4 text-sm font-bold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(200,162,74,0.5)] hover:brightness-110">
            Unlock Investor Report — R349
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <div className="mt-4">
            <a href="/" className="inline-block text-sm text-white/40 transition-colors hover:text-white">
              Analyze Another Property
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
