'use client';

import { Check, Crown } from 'lucide-react';

const FEATURES = [
  'EiX Investment Score™',
  'Rental Yield Estimate',
  'Cash Flow Analysis',
  'Risk Score',
  'AI Confidence Meter™',
  '24-hour delivery',
];

export function PricingCard() {
  return (
    <div className="glass-strong relative overflow-hidden rounded-2xl p-7 sm:p-8">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-500/8 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400 ring-1 ring-teal-500/20">
            Founding Beta
          </span>
        </div>
        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-5xl font-bold text-white">R149</span>
          <span className="text-sm text-white/40">one-time</span>
        </div>
        <p className="mt-2 text-sm text-white/50">
          One property · Delivered within 24 hours
        </p>
        <div className="my-6 h-px bg-white/8" />
        <ul className="space-y-3">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-white/70">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/15">
                <Check className="h-3 w-3 text-teal-400" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <div className="my-6 h-px bg-white/8" />
        <p className="text-xs text-white/40">
          Limited launch pricing before the full platform rolls out.
        </p>
      </div>
    </div>
  );
}

export function PricingCardPro() {
  return (
    <div className="glass-gold relative overflow-hidden rounded-2xl p-7 sm:p-8 glow-gold">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold-500/8 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400 ring-1 ring-gold-500/20">
            <Crown className="h-3 w-3" />
            Investor Report Pro
          </span>
        </div>
        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-5xl font-bold text-white">R349</span>
          <span className="text-sm text-white/40">one-time</span>
        </div>
        <p className="mt-2 text-sm text-white/50">
          Full investor analysis · Delivered with your report
        </p>
        <div className="my-6 h-px bg-white/8" />
        <ul className="space-y-3">
          {[
            'Everything in Founding Beta',
            'Comparable sales analysis',
            'Rental demand insights',
            'Negotiation opportunities',
            'Investment risk breakdown',
            'Growth outlook & exit strategy',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-white/70">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold-500/15">
                <Check className="h-3 w-3 text-gold-400" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
