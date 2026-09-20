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
    const scenarios = [9.5, 10.5, 11.5, 12.5].map(rate => ({
      rate, payment: calcBond(loan, rate)
    }));
    const knownEntry = deposit + duty;
    const dutyPct = price > 0 ? (duty / price) * 100 : 0;
    const breakEven = [3, 6, 9].map(rate => ({
      rate,
      years: rate > 0 ? Math.log(1 + dutyPct / 100) / Math.log(1 + rate / 100) : null
    }));
    return { deposit, loan, duty, recurring, scenarios, knownEntry, breakEven };
  })();

  const factCompleteness = [
    facts.title, facts.address, facts.propertyType, facts.askingPriceCents,
    facts.bedrooms, facts.bathrooms, facts.floorSizeM2, facts.landSizeM2
  ].filter(v => v !== null && v !== undefined && v !== '').length;

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

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[.08] to-white/[.025] p-5 shadow-2xl sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-teal-300">
            <ShieldCheck className="h-4 w-4" /> EiX Buyer Intelligence Report™
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_.8fr] md:items-end">
            <div>
              <p className="text-sm text-white/45">{text(facts.propertyType, 'Property')}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{text(facts.title, 'Property analysis')}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/55"><MapPin className="h-4 w-4" />{text(facts.address)}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1.5">{text(facts.bedrooms, '—')} Bed</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{text(facts.bathrooms, '—')} Bath</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{facts.floorSizeM2 ? `${facts.floorSizeM2} m²` : '— m²'}</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{text(facts.propertyType, 'Type')}</span>
              </div>
            </div>
            <div className="rounded-3xl border border-teal-300/20 bg-teal-300/[.07] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/45">Asking price</p>
              <p className="mt-2 text-3xl font-black text-teal-200">{money(price)}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/45">Decision state</p>
              <p className="mt-1 text-lg font-black text-white">{state.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{state.detail}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-teal-300/20 bg-white/[.045] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-300">Signature evidence layer</p>
              <h2 className="mt-1 text-2xl font-bold">Offer Confidence™</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">How much confidence can be placed in the current decision, based on the evidence available to EiX—not a prediction of future value and not a formal valuation.</p>
            </div>
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[8px] border-teal-300/25 bg-teal-300/[.06] text-3xl font-black text-teal-200">{confidence}%</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Property facts" state={factCompleteness >= 6 ? 'verified' : 'unknown'} detail={`${factCompleteness}/8 core property fields available`} />
            <StatusRow label="Comparable sales" state={marketEvidence} detail={`${achievedCount} verified achieved-sale comparables · ${activeCount} active listings · ${pendingCount} pending sales`} />
            <StatusRow label="Ownership cost" state={costEvidence} detail={costEvidence === 'verified' ? 'Asking price plus at least one verified recurring cost is available.' : 'Cost inputs remain incomplete.'} />
            <StatusRow label="Documents & condition" state={documentEvidence} detail={documentEvidence === 'missing' ? 'Important transaction evidence remains unverified.' : 'Document evidence is not fully established from the supplied report inputs.'} />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-teal-300" /><h2 className="text-xl font-bold">Real Cost to Own</h2></div>
          {acquisition ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Deposit (10%)', money(acquisition.deposit)],
                  ['Transfer duty', money(acquisition.duty)],
                  ['Loan scenario', money(acquisition.loan)],
                  ['Known cash to close*', money(acquisition.knownEntry)],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-xs uppercase tracking-wider text-white/40">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-sm text-white/55">*Known cash to close includes the 10% deposit plus scenario transfer duty. Conveyancing, bond registration, bank charges, inspection and other transaction costs are not included unless verified.</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 p-4"><p className="text-xs uppercase text-white/40">Bond @ 10.5%</p><p className="mt-2 text-xl font-bold">{money(acquisition.scenarios[1].payment)}</p></div>
                <div className="rounded-2xl border border-white/10 p-4"><p className="text-xs uppercase text-white/40">Rates + levy</p><p className="mt-2 text-xl font-bold">{acquisition.recurring === null ? 'Not verified' : money(acquisition.recurring)}</p></div>
                <div className="rounded-2xl border border-teal-300/20 bg-teal-300/[.06] p-4"><p className="text-xs uppercase text-teal-200/60">Known monthly cost</p><p className="mt-2 text-xl font-bold text-teal-100">{acquisition.recurring === null ? 'Not verified' : money(acquisition.scenarios[1].payment + acquisition.recurring)}</p></div>
              </div>
            </>
          ) : <p className="mt-4 text-sm text-white/55">A verified asking price is required before acquisition scenarios can be calculated.</p>}
        </section>

        {acquisition && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-teal-300" /><h2 className="text-xl font-bold">Bond Stress Test</h2></div>
            <p className="mt-2 text-sm text-white/50">Reference scenario: 10.50% annual interest, 10% deposit, 20-year term. Illustrative stress testing only.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {acquisition.scenarios.map((s) => <div key={s.rate} className={`rounded-2xl border p-4 ${s.rate === 10.5 ? 'border-teal-300/30 bg-teal-300/[.06]' : 'border-white/10 bg-white/[.025]'}`}><p className="text-xs uppercase tracking-wider text-white/40">{s.rate === 10.5 ? 'Reference' : 'Stress'} · {s.rate}%</p><p className="mt-2 text-xl font-bold">{money(s.payment)}</p><p className="mt-1 text-xs text-white/40">monthly bond</p></div>)}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-300">Core question</p><h2 className="mt-1 text-xl font-bold">Price Fairness</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold">{achievedCount} verified sales</span></div>
          {achievedCount >= 3 && score.achievedSaleMedianPriceCents ? (
            <div className="mt-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 p-4"><p className="text-xs uppercase text-white/40">Asking</p><p className="mt-2 text-2xl font-bold">{money(price)}</p></div>
                <div className="rounded-2xl border border-white/10 p-4"><p className="text-xs uppercase text-white/40">Achieved-sale benchmark</p><p className="mt-2 text-2xl font-bold">{money(score.achievedSaleMedianPriceCents)}</p></div>
                <div className="rounded-2xl border border-teal-300/20 bg-teal-300/[.06] p-4"><p className="text-xs uppercase text-teal-200/60">Subject vs benchmark</p><p className="mt-2 text-2xl font-bold text-teal-100">{numberValue(score.subjectVsMedianPercent)?.toFixed(1) ?? '—'}%</p></div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/55">This conclusion is based on {achievedCount} verified achieved-sale comparables. Active asking listings are shown separately and do not establish price fairness.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[.05] p-5">
              <p className="text-lg font-bold text-amber-100">Price fairness: Not yet established</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">EiX has {achievedCount} verified achieved-sale comparable{achievedCount === 1 ? '' : 's'}. At least 3 are required before the report can establish an achieved-sale price benchmark.</p>
              {(activeCount > 0 || pendingCount > 0) && <p className="mt-3 text-sm text-white/50">For context only: {activeCount} active listing{activeCount === 1 ? '' : 's'} and {pendingCount} pending sale{pendingCount === 1 ? '' : 's'} were identified. These are not treated as achieved sales.</p>}
            </div>
          )}
        </section>

        {acquisition && (
          <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
            <h2 className="text-xl font-bold">Break-Even Analysis</h2>
            <p className="mt-2 text-sm text-white/50">Shows how quickly annual appreciation would mathematically recover the known transfer-duty component of the acquisition cost. It is not a property-price forecast.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {acquisition.breakEven.map(x => <div key={x.rate} className="rounded-2xl border border-white/10 p-4"><p className="text-xs uppercase text-white/40">{x.rate}% annual appreciation</p><p className="mt-2 text-2xl font-bold">{x.years === null ? '—' : `${x.years.toFixed(1)} yrs`}</p></div>)}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center gap-2"><Home className="h-5 w-5 text-teal-300" /><h2 className="text-xl font-bold">Neighbourhood DNA™</h2></div>
          <p className="mt-2 text-sm text-white/50">Location intelligence is shown only where the report contains supporting evidence. EiX does not manufacture neighbourhood scores from missing data.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Location', text(facts.suburb || facts.city)],
              ['Province', text(facts.province)],
              ['Transport', 'Evidence required'],
              ['Schools / healthcare', 'Evidence required'],
              ['Lifestyle / retail', 'Evidence required'],
              ['Safety indicators', 'Evidence required'],
              ['Parks / recreation', 'Evidence required'],
              ['Market momentum', achievedCount >= 3 ? 'Market evidence available' : 'Evidence limited'],
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 p-4"><p className="text-xs uppercase tracking-wider text-white/40">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-300" /><h2 className="text-xl font-bold">Risks & Missing Evidence</h2></div>
          <div className="mt-5 space-y-3">
            {(limitations.length ? limitations : ['No material limitations were recorded in the report.']).map((item: string) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-sm leading-relaxed text-white/65">{item}</p></div>)}
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-teal-300" /><h2 className="text-xl font-bold">Buyer Document Pack</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Listing / property facts" state={factCompleteness >= 6 ? 'verified' : 'unknown'} />
            <StatusRow label="Comparable sales evidence" state={achievedCount >= 3 ? 'verified' : 'missing'} />
            <StatusRow label="Approved building plans" state={statusFromLimitations(limitations, ['building plans']) === 'missing' ? 'missing' : 'unknown'} />
            <StatusRow label="Compliance certificates" state={statusFromLimitations(limitations, ['compliance']) === 'missing' ? 'missing' : 'unknown'} />
            <StatusRow label="Independent inspection" state={statusFromLimitations(limitations, ['inspection']) === 'missing' ? 'missing' : 'unknown'} />
            <StatusRow label="Title / heritage checks" state={statusFromLimitations(limitations, ['title', 'heritage']) === 'missing' ? 'missing' : 'unknown'} />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-teal-300/20 bg-teal-300/[.045] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-300">Your next move</p>
          <h2 className="mt-1 text-2xl font-bold">Questions for the agent</h2>
          <ol className="mt-5 space-y-3">
            {[
              'Can you provide recent achieved comparable sales supporting the asking price?',
              'Can you provide the approved building plans and confirm they match the current property?',
              'Are all additions and alterations approved?',
              'Are current compliance certificates available?',
              'Are there any known structural defects, notices, disputes or restrictions?',
              'Can you confirm current municipal rates and any outstanding amounts?',
            ].map((q, i) => <li key={q} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-300/15 text-xs font-bold text-teal-200">{i + 1}</span><span className="text-sm leading-relaxed text-white/70">{q}</span></li>)}
          </ol>
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs uppercase tracking-wider text-white/40">EiX Buyer Position</p>
            <p className="mt-2 text-xl font-bold">{state.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{state.detail}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
          <div className="flex items-center gap-2"><Info className="h-5 w-5 text-white/50" /><h2 className="text-lg font-bold">Method & limitations</h2></div>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/50">
            {(report.assumptions || []).map(a => <li key={a}>• {a}</li>)}
            <li>• Price fairness requires at least 3 verified achieved-sale comparables; active listings and pending sales are displayed separately.</li>
            <li>• Acquisition figures are scenario estimates and are not formal lending, tax, legal or valuation advice.</li>
            <li>• Missing evidence reduces decision confidence; EiX does not substitute assumptions for unavailable property evidence.</li>
          </ul>
        </section>

        <footer className="px-2 py-8 text-center text-xs text-white/30">
          EiX Property Score™ · EiX Buyer Intelligence Report™ · Evidence-first property decision intelligence
          {report.processed_at ? ` · ${new Date(report.processed_at).toLocaleString('en-ZA')}` : ''}
        </footer>
      </div>
    </main>
  );
}
