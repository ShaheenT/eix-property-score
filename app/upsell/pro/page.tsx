'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, ShieldAlert, Target, ArrowRight, Building2,
  Loader2, Sparkles,
} from 'lucide-react';
import { PricingCardPro } from '@/components/pricing-card';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const PRO_FEATURES = [
  { icon: <BarChart3 className="h-5 w-5" />, title: 'Comparable Sales', desc: 'See recent sale prices of similar properties in the area to gauge if the asking price is fair.' },
  { icon: <TrendingUp className="h-5 w-5" />, title: 'Rental Demand', desc: 'Area rental demand analysis with vacancy rates and tenant pool demographics.' },
  { icon: <Target className="h-5 w-5" />, title: 'Negotiation Opportunities', desc: 'Identify leverages—days on market, price drops, and listing gaps to negotiate a better deal.' },
  { icon: <ShieldAlert className="h-5 w-5" />, title: 'Investment Risks', desc: 'Detailed risk breakdown: area decline indicators, oversupply, and regulatory risks.' },
  { icon: <Sparkles className="h-5 w-5" />, title: 'Growth Outlook', desc: '5-year area growth projections based on infrastructure plans and market trends.' },
  { icon: <ArrowRight className="h-5 w-5" />, title: 'Exit Strategy', desc: 'Recommended exit timelines and strategies—rent, sell, or hold—based on your goal.' },
];

export default function UpsellProPage() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Returning Customer',
          email: 'customer@eix.ai',
          listing_url: 'https://www.property24.com/upsell-pro',
          goal: 'Rental',
          product: 'investor_report_pro',
        }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch {
      toast({ title: 'Checkout error', description: 'Could not start Pro checkout. Please try again.', variant: 'destructive' });
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[120px]" />
      </div>
      <nav className="relative z-50 flex items-center justify-center px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-400 shadow-[0_0_20px_rgba(14,165,164,0.3)]">
            <Building2 className="h-5 w-5 text-midnight-900" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            EiX<span className="text-teal-400"> Concierge Engine</span>
            <sup className="ml-0.5 text-[10px] text-teal-400/70">™</sup>
          </span>
        </div>
      </nav>
      <section className={`relative z-10 mx-auto max-w-5xl px-6 py-16 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
        <div className="text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">Upgrade Your Report</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Want the Full <span className="text-gradient-gold">Investor Report?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Take your analysis further. The Investor Report Pro adds comparable sales, rental demand, negotiation insights, growth outlook, and exit strategy to your standard report.
          </p>
        </div>
        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {PRO_FEATURES.map((feature) => (
              <div key={feature.title} className="group glass rounded-2xl p-6 transition-all duration-300 hover:border-gold-500/20 hover:bg-white/[0.04]">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/20">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.desc}</p>
              </div>
            ))}
          </div>
          <div className="lg:sticky lg:top-8">
            <PricingCardPro />
            <button
              onClick={handleAccept}
              disabled={loading}
              className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 py-5 text-base font-bold text-midnight-900 transition-all hover:shadow-[0_0_30px_rgba(200,162,74,0.5)] hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Redirecting to checkout...</>
              ) : (
                <>Unlock Investor Report — R349<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
            <a href="/success" className="mt-3 block text-center text-sm text-white/40 transition-colors hover:text-white/70">
              Maybe Later
            </a>
          </div>
        </div>
      </section>
      <Toaster />
    </main>
  );
}
