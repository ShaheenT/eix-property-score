import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import {
  AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, FileCheck2,
  Home, Info, MapPin, ShieldCheck, TrendingUp, WalletCards, Waves
} from 'lucide-react';
import { ReportPrintButton } from '@/components/report-print-button';

type Report = {
  id: string;
  status: string;
  report_type: string | null;
  investment_score: number | null;
  ai_confidence: number | null;
  property_facts: Record<string, any> | null;
  property_evidence: any[] | null;
  score_breakdown: Record<string, any> | null;
  assumptions: string[] | null;
  limitations: string[] | null;
  rental_yield_percent: number | null;
  bond_monthly_payment_cents: number | null;
  bond_loan_amount_cents: number | null;
  risk_level: string | null;
  recommendation: string | null;
  confidence_label: string | null;
  access_token: string;
  processed_at: string | null;
  investor_analysis: Record<string, any> | null;
  international_buyer_analysis: Record<string, any> | null;
};

function money(cents: unknown): string {
  return typeof cents !== 'number' || !Number.isFinite(cents)
    ? 'Not verified'
    : `R ${(cents / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown, fallback = 'Not verified'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function yesNo(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not verified';
}

function calcBond(principalCents: number, annualRate: number, years = 20): number {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return Math.round(principalCents / months);
  const factor = Math.pow(1 + monthlyRate, months);
  return Math.round(principalCents * ((monthlyRate * factor) / (factor - 1)));
}

function calcTransferDuty(priceCents: number): number {
  const p = priceCents / 100;
  if (p <= 1_210_000) return 0;
  if (p <= 1_663_800) return Math.round((p - 1_210_000) * .03 * 100);
  if (p <= 2_329_300) return Math.round((13_614 + (p - 1_663_800) * .06) * 100);
  if (p <= 2_994_800) return Math.round((53_544 + (p - 2_329_300) * .08) * 100);
  if (p <= 13_310_000) return Math.round((106_784 + (p - 2_994_800) * .11) * 100);
  return Math.round((1_241_456 + (p - 13_310_000) * .13) * 100);
}

function decisionState(report: Report, achievedCount: number): { label: string; detail: string } {
  const pct = numberValue(report.score_breakdown?.subjectVsMedianPercent);
  if (achievedCount < 3) {
    return {
      label: 'GATHER EVIDENCE',
      detail: `Price fairness is not established. ${achievedCount} verified achieved-sale comparables are available; at least 3 are required for an EiX price benchmark.`,
    };
  }
  if (pct === null) {
    return { label: 'GATHER EVIDENCE', detail: 'A defensible achieved-sale benchmark is not currently available.' };
  }
  if (pct <= -5) return { label: 'PRICED BELOW BENCHMARK', detail: 'The asking price is at least 5% below the achieved-sale median. Property-specific differences still require review.' };
  if (pct >= 5) return { label: 'NEGOTIATE', detail: 'The asking price is at least 5% above the achieved-sale median. The premium should be explained by property-specific evidence.' };
  return { label: 'PRICED IN LINE', detail: 'The asking price is within approximately 5% of the achieved-sale median. This is market evidence, not a formal valuation.' };
}

function statusFromLimitations(limitations: string[], keywords: string[]): 'verified' | 'missing' | 'unknown' {
  const found = limitations.some(item => keywords.some(k => item.toLowerCase().includes(k)));
  return found ? 'missing' : 'unknown';
}

function StatusRow({ label, state, detail }: { label: string; state: 'verified' | 'missing' | 'unknown'; detail?: string }) {
  const Icon = state === 'verified' ? CheckCircle2 : state === 'missing' ? AlertTriangle : CircleHelp;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <Icon className={state === 'verified' ? 'mt-0.5 h-5 w-5 text-teal-300' : state === 'missing' ? 'mt-0.5 h-5 w-5 text-amber-300' : 'mt-0.5 h-5 w-5 text-white/40'} />
      <div>
        <p className="font-semibold">{label}</p>
        {detail && <p className="mt-1 text-sm text-white/55">{detail}</p>}
      </div>
    </div>
  );
}

export default async function CustomerReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();
  const { data: report } = await supabaseAdmin.from('reports').select('id,status,report_type,investment_score,ai_confidence,property_facts,property_evidence,score_breakdown,assumptions,limitations,rental_yield_percent,bond_monthly_payment_cents,bond_loan_amount_cents,risk_level,recommendation,confidence_label,access_token,processed_at,investor_analysis,international_buyer_analysis').eq('id', id).eq('access_token', token).single();
  if (!report || !['completed','sent'].includes(report.status)) notFound();
  const facts = report.property_facts || {};
  const limitations = report.limitations || [];
  const evidence = Array.isArray(report.property_evidence) ? report.property_evidence : [];
  const score = report.score_breakdown || {};
  const investor = report.investor_analysis || {};
  const international = report.international_buyer_analysis || null;

  const price = numberValue(facts.askingPriceCents);
  const achievedCount = numberValue(score.verifiedAchievedSaleCount) ?? 0;
  const activeCount = numberValue(score.activeListingCount) ?? 0;
  const pendingCount = numberValue(score.pendingSaleCount) ?? 0;
  const confidence = numberValue(report.ai_confidence) ?? 0;
  const state = decisionState(report, achievedCount);

  const acquisition = (() => {
    if (price === null) return null;
    const deposit = Math.round(price * .10);
    const loan = price - deposit;
    const duty = calcTransferDuty(price);
    const rates = numberValue(facts.ratesAndTaxesCents) ?? 0;
    const levy = numberValue(facts.leviesCents) ?? 0;
    const recurring = (numberValue(facts.ratesAndTaxesCents) !== null || numberValue(facts.leviesCents) !== null) ? rates + levy : null;
    const scenarios = [9.5, 10.5, 11.5, 12.5].map(rate => ({ rate, payment: calcBond(loan, rate) }));
    const knownEntry = deposit + duty;
    const dutyPct = price > 0 ? (duty / price) * 100 : 0;
    const breakEven = [3, 6, 9].map(rate => ({ rate, years: rate > 0 ? Math.log(1 + dutyPct / 100) / Math.log(1 + rate / 100) : null }));
    return { deposit, loan, duty, recurring, scenarios, knownEntry, breakEven };
  })();

  const factCompleteness = [facts.title, facts.address, facts.propertyType, facts.askingPriceCents, facts.bedrooms, facts.bathrooms, facts.floorSizeM2, facts.landSizeM2].filter(v => v !== null && v !== undefined && v !== '').length;
  const marketEvidence = achievedCount >= 3 ? 'verified' : (activeCount > 0 || pendingCount > 0 ? 'unknown' : 'missing');
  const costEvidence = price !== null && (facts.ratesAndTaxesCents !== null || facts.leviesCents !== null) ? 'verified' : 'unknown';
  const documentEvidence = statusFromLimitations(limitations, ['building plans', 'compliance', 'inspection', 'title', 'heritage']);

  return (
    <main className="min-h-screen bg-midnight px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-10 w-auto sm:h-12" />
          <ReportPrintButton />
        </header>
        {/* report body unchanged */}
      </div>
    </main>
  );
}

.replace(/\s*\/\* report body unchanged \*\/\s*/,'\n        {/* report body unchanged */}\n')}