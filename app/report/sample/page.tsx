'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Home as HomeIcon, TrendingUp, Percent, ShieldAlert,
  MapPin, Target, ArrowRight, Printer,
} from 'lucide-react';
import { ScoreGauge } from '@/components/score-gauge';
import { ConfidenceMeter } from '@/components/confidence-meter';

const REPORT_DATA = {
  propertyName: 'Sample Property — 3 Bed Townhouse',
  address: 'Sandown, Sandton, Gauteng',
  askingPrice: 'R 2,450,000',
  source: 'Property24',
  score: 91,
  marketValue: 'R 2.52M',
  monthlyCashflow: 'R 8,420',
  grossYield: '8.9%',
  riskScore: 'Low',
  confidence: 95,
  recommendation: 'Strong Buy',
  proFeatures: {
    comparableSales: 'R 2.38M – R 2.61M (12 recent sales)',
    rentalDemand: 'High — 2.1% vacancy rate',
    negotiationOpportunities: 'Listed 47 days — room to negotiate 3-5% below asking',
    investmentRisks: 'Low oversupply risk, minor load-shedding impact',
    growthOutlook: '+6.8% projected annual growth (5-year)',
    exitStrategy: 'Hold 5-7 years for optimal capital appreciation',
  },
};

export default function ReportPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-midnight">
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-40" />
      <nav className="no-print relative z-50 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-400">
            <Building2 className="h-5 w-5 text-midnight-900" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            EiX<span className="text-teal-400"> Property Score</span>
            <sup className="ml-0.5 text-[10px] text-teal-400/70">™</sup>
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-midnight-900 transition-all hover:brightness-110"
        >
          <Printer className="h-4 w-4" />
          Download PDF
        </button>
      </nav>

      <div className={`relative z-10 mx-auto max-w-4xl px-6 py-10 ${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
        <div className="glass-strong relative overflow-hidden rounded-3xl p-8 sm:p-12 glow-teal">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative flex items-center gap-2 text-sm text-teal-400">
            <Building2 className="h-4 w-4" />
            EiX Property Score™ Report
          </div>
          <div className="relative mt-8 flex flex-col items-center">
            <ScoreGauge score={REPORT_DATA.score} size={240} />
          </div>
          <div className="relative mt-8 text-center">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{REPORT_DATA.propertyName}</h1>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-white/50">
              <MapPin className="h-4 w-4" />
              {REPORT_DATA.address}
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-1.5 text-sm font-semibold text-teal-400 ring-1 ring-teal-500/20">
              <Target className="h-4 w-4" />
              AI Recommendation: {REPORT_DATA.recommendation}
            </div>
          </div>
          <div className="relative mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <ConfidenceMeter value={REPORT_DATA.confidence} size="md" />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold text-white">Investment Snapshot</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Asking Price', value: REPORT_DATA.askingPrice, icon: <HomeIcon className="h-5 w-5" /> },
              { label: 'Market Value', value: REPORT_DATA.marketValue, icon: <TrendingUp className="h-5 w-5" /> },
              { label: 'Monthly Cash Flow', value: REPORT_DATA.monthlyCashflow, icon: <TrendingUp className="h-5 w-5" /> },
              { label: 'Gross Yield', value: REPORT_DATA.grossYield, icon: <Percent className="h-5 w-5" /> },
            ].map((item) => (
              <div key={item.label} className="glass rounded-2xl p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
                  {item.icon}
                </div>
                <div className="mt-3 text-xs font-medium uppercase tracking-wider text-white/40">{item.label}</div>
                <div className="mt-1 text-xl font-bold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Risk Score</h3>
              <p className="text-sm text-white/50">{REPORT_DATA.riskScore} Risk</p>
            </div>
          </div>
        </div>

        <div className="mt-8 glass-gold rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-400 ring-1 ring-gold-500/25">
              Investor Report Pro
            </span>
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">Market Context & Investor Analysis</h2>
          <div className="mt-6 space-y-4">
            {[
              { label: 'Comparable Sales', value: REPORT_DATA.proFeatures.comparableSales },
              { label: 'Rental Demand', value: REPORT_DATA.proFeatures.rentalDemand },
              { label: 'Negotiation Opportunities', value: REPORT_DATA.proFeatures.negotiationOpportunities },
              { label: 'Investment Risks', value: REPORT_DATA.proFeatures.investmentRisks },
              { label: 'Growth Outlook', value: REPORT_DATA.proFeatures.growthOutlook },
              { label: 'Exit Strategy', value: REPORT_DATA.proFeatures.exitStrategy },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1 border-b border-white/5 pb-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="w-48 shrink-0 text-sm font-medium text-gold-400/80">{item.label}</div>
                <div className="text-sm text-white/70">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 glass-strong rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white">AI Recommendation</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/25">
              <Target className="h-7 w-7" />
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-400">{REPORT_DATA.recommendation}</div>
              <p className="text-sm text-white/50">Based on the AI Confidence Meter and market analysis</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            This property shows strong investment fundamentals with positive cash flow, above-average yield, and low risk. The asking price is within the fair market range. Consider negotiating 3-5% below asking given the time on market.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 pb-10 text-center no-print">
          <a href="/" className="group inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">
            Back to EiX
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <p className="text-xs text-white/30">
            EiX Property Score™ · AI-generated report · {REPORT_DATA.source} · © 2026 EiX
          </p>
        </div>
      </div>
    </main>
  );
}
