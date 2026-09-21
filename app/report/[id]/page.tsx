import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import {
  AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, FileCheck2,
  Home, Info, MapPin, ShieldCheck, TrendingUp, WalletCards, Waves
} from 'lucide-react';
import { ReportPrintButton } from '@/components/report-print-button';
import { getNeighbourhoodIntelligence, neighbourhoodSummary } from '@/lib/neighbourhood-intelligence';

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
    <div className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,.03)]">
      <Icon className={state === 'verified' ? 'mt-0.5 h-5 w-5 text-[#2563EB]' : state === 'missing' ? 'mt-0.5 h-5 w-5 text-[#F59E0B]' : 'mt-0.5 h-5 w-5 text-[#94A3B8]'} />
      <div>
        <p className="font-semibold">{label}</p>
        {detail && <p className="mt-1 text-sm text-[#64748B]">{detail}</p>}
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
  const neighbourhood = await getNeighbourhoodIntelligence(facts as any);

  const price = numberValue(facts.askingPriceCents);
  const achievedCount = numberValue(score.verifiedAchievedSaleCount) ?? 0;
  const activeCount = numberValue(score.activeListingCount) ?? 0;
  const pendingCount = numberValue(score.pendingSaleCount) ?? 0;
  const confidence = numberValue(report.ai_confidence) ?? 0;
  const listingArea = neighbourhood.location.areaLabel || facts.suburb || facts.city || null;
  const locationLine = listingArea
    ? (facts.address ? `${listingArea} · ${facts.address}` : `${listingArea} · Exact street address not verified`)
    : 'Location not verified';
  const marketMomentum = achievedCount >= 3
    ? `${achievedCount} verified achieved sales; ${activeCount} active listings; ${pendingCount} pending sales`
    : (activeCount > 0 || pendingCount > 0
      ? `${activeCount} active listings and ${pendingCount} pending sales identified; achieved-sale evidence remains limited`
      : 'Market evidence not retrieved');
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
    <main className="min-h-screen bg-[#F5F7FA] text-[#0B1220] selection:bg-[#2563EB]/20">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8 sm:py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><img src="/eixproplogo.png" alt="EiX Property Score" className="h-9 w-auto sm:h-10" /><span className="hidden h-5 w-px bg-[#D8DEE8] sm:block" /><span className="hidden text-xs font-semibold uppercase tracking-[.18em] text-[#64748B] sm:block">Buyer Intelligence</span></div>
          <ReportPrintButton />
        </header>

        <section className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_24px_70px_rgba(15,23,42,.10)]">
          {facts.primaryImageUrl ? (
            <div className="relative h-[300px] w-full overflow-hidden sm:h-[390px] lg:h-[500px]">
              <img src={facts.primaryImageUrl} alt={text(facts.title, 'Property')} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071A3D]/85 via-[#071A3D]/10 to-transparent" />
              <div className="absolute bottom-5 left-5 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">Property image from supplied listing evidence</div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center bg-white/[.03] text-sm text-[#94A3B8] sm:h-64">Property image not verified from the supplied source</div>
          )}
          <div className="p-6 sm:p-9">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.20em] text-[#2563EB]">
            <ShieldCheck className="h-4 w-4" /> EiX Buyer Intelligence Report™
          </div>
          <div className="mt-5 grid gap-7 md:grid-cols-[1.5fr_.8fr] md:items-end">
            <div>
              <p className="text-sm font-medium text-[#64748B]">{text(facts.propertyType, 'Property')}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#0B1220] sm:text-5xl">{text(facts.title, 'Property analysis')}</h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-[#64748B]"><MapPin className="h-4 w-4" />{locationLine}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm text-[#475569]">
                <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5">{text(facts.bedrooms, '—')} Bed</span>
                <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5">{text(facts.bathrooms, '—')} Bath</span>
                <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5">{facts.floorSizeM2 ? `${facts.floorSizeM2} m²` : '— m²'}</span>
                <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5">{text(facts.propertyType, 'Type')}</span>
              </div>
            </div>
            <div className="rounded-[24px] border border-[#DCE6F7] bg-[#F7FAFF] p-5 shadow-[0_10px_30px_rgba(37,99,235,.06)]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#64748B]">Asking price</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#0B1220]">{money(price)}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#64748B]">Decision state</p>
              <p className="mt-1 text-lg font-black text-[#2563EB]">{state.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{state.detail}</p>
            </div>
          </div>
        </div>
        </section>

        <nav className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm sm:grid-cols-5">
          {['Decision','Cost to own','Price fairness','Property DNA','Due diligence'].map((item, i) => (
            <div key={item} className="border-b border-[#E2E8F0] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[.12em] text-[#64748B] sm:border-b-0 sm:border-r last:border-r-0">
              <span className="mr-1 text-[#2563EB]">0{i + 1}</span>{item}
            </div>
          ))}
        </nav>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[.20em] text-[#2563EB]">01 · Decision intelligence</p><p className="mt-3 text-xs font-bold uppercase tracking-[.18em] text-[#64748B]">The EiX X-Ray</p>
          <h2 className="mt-1 text-2xl font-bold">What the listing says is not the same as what it means.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#64748B]">The property profile is useful, but the central decision question is whether the asking price is supported by verified market evidence and whether the remaining transaction risks have been resolved.</p>
          <div className="mt-5 rounded-2xl border border-[#F5D9A6] bg-[#FFF8EB] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">The Biggest Question</p>
            <p className="mt-2 text-xl font-bold">Does the market support the asking price for this particular property?</p>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">Until the required evidence is available, EiX does not manufacture a price opinion.</p>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2563EB]">Signature evidence layer</p>
              <h2 className="mt-1 text-2xl font-bold">Offer Confidence™</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#64748B]">How much confidence can be placed in the current decision, based on the evidence available to EiX—not a prediction of future value and not a formal valuation.</p>
            </div>
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[8px] border-[#DCE6F7] bg-[#F0F6FF] text-3xl font-semibold text-[#0B1220]">{confidence}%</div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Property facts" state={factCompleteness >= 6 ? 'verified' : 'unknown'} detail={`${factCompleteness}/8 core property fields available`} />
            <StatusRow label="Comparable sales" state={marketEvidence} detail={`${achievedCount} verified achieved-sale comparables · ${activeCount} active listings · ${pendingCount} pending sales`} />
            <StatusRow label="Ownership cost" state={costEvidence} detail={costEvidence === 'verified' ? 'Asking price plus at least one verified recurring cost is available.' : 'Cost inputs remain incomplete.'} />
            <StatusRow label="Documents & condition" state={documentEvidence} detail={documentEvidence === 'missing' ? 'Important transaction evidence remains unverified.' : 'Document evidence is not fully established from the supplied report inputs.'} />
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-[#2563EB]" /><h2 className="text-xl font-bold">Real Cost to Own</h2></div>
          {acquisition ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Deposit (10%)', money(acquisition.deposit)],
                  ['Transfer duty', money(acquisition.duty)],
                  ['Loan scenario', money(acquisition.loan)],
                  ['Known cash to close*', money(acquisition.knownEntry)],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"><p className="text-xs uppercase tracking-wider text-[#94A3B8]">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}
              </div>
              <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">*Known cash to close includes the 10% deposit plus scenario transfer duty. Conveyancing, bond registration, bank charges, inspection and other transaction costs are not included unless verified.</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#E2E8F0] p-4"><p className="text-xs uppercase text-[#94A3B8]">Bond @ 10.5%</p><p className="mt-2 text-xl font-bold">{money(acquisition.scenarios[1].payment)}</p></div>
                <div className="rounded-2xl border border-[#E2E8F0] p-4"><p className="text-xs uppercase text-[#94A3B8]">Rates + levy</p><p className="mt-2 text-xl font-bold">{acquisition.recurring === null ? 'Not verified' : money(acquisition.recurring)}</p></div>
                <div className="rounded-2xl border border-[#DCE6F7] bg-[#F0F6FF] p-4"><p className="text-xs uppercase text-[#0B1220]/60">Known monthly cost</p><p className="mt-2 text-xl font-bold text-[#0B1220]">{acquisition.recurring === null ? 'Not verified' : money(acquisition.scenarios[1].payment + acquisition.recurring)}</p></div>
              </div>
            </>
          ) : <p className="mt-4 text-sm text-[#64748B]">A verified asking price is required before acquisition scenarios can be calculated.</p>}
        </section>

        {acquisition && (
          <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
            <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[#2563EB]" /><h2 className="text-xl font-bold">Bond Stress Test</h2></div>
            <p className="mt-2 text-sm text-[#64748B]">Reference scenario: 10.50% annual interest, 10% deposit, 20-year term. Illustrative stress testing only.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {acquisition.scenarios.map((s) => <div key={s.rate} className={`rounded-2xl border p-4 ${s.rate === 10.5 ? 'border-[#BFD3F5] bg-[#F0F6FF]' : 'border-[#E2E8F0] bg-[#F8FAFC]'}`}><p className="text-xs uppercase tracking-wider text-[#94A3B8]">{s.rate === 10.5 ? 'Reference' : 'Stress'} · {s.rate}%</p><p className="mt-2 text-xl font-bold">{money(s.payment)}</p><p className="mt-1 text-xs text-[#94A3B8]">monthly bond</p></div>)}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">Core question</p><h2 className="mt-1 text-xl font-bold">Price Fairness</h2></div><span className="rounded-full border border-[#E2E8F0] px-3 py-1 text-xs font-semibold">{achievedCount} verified sales</span></div>
          {achievedCount >= 3 && score.achievedSaleMedianPriceCents ? (
            <div className="mt-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#E2E8F0] p-4"><p className="text-xs uppercase text-[#94A3B8]">Asking</p><p className="mt-2 text-2xl font-bold">{money(price)}</p></div>
                <div className="rounded-2xl border border-[#E2E8F0] p-4"><p className="text-xs uppercase text-[#94A3B8]">Achieved-sale benchmark</p><p className="mt-2 text-2xl font-bold">{money(score.achievedSaleMedianPriceCents)}</p></div>
                <div className="rounded-2xl border border-[#DCE6F7] bg-[#F0F6FF] p-4"><p className="text-xs uppercase text-[#0B1220]/60">Subject vs benchmark</p><p className="mt-2 text-2xl font-bold text-[#0B1220]">{numberValue(score.subjectVsMedianPercent)?.toFixed(1) ?? '—'}%</p></div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#64748B]">This conclusion is based on {achievedCount} verified achieved-sale comparables. Active asking listings are shown separately and do not establish price fairness.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#F5D9A6] bg-[#FFF8EB] p-5">
              <p className="text-lg font-bold text-[#92400E]">Price fairness: Not yet established</p>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">EiX has {achievedCount} verified achieved-sale comparable{achievedCount === 1 ? '' : 's'}. At least 3 are required before the report can establish an achieved-sale price benchmark.</p>
              {(activeCount > 0 || pendingCount > 0) && <p className="mt-3 text-sm text-[#64748B]">For context only: {activeCount} active listing{activeCount === 1 ? '' : 's'} and {pendingCount} pending sale{pendingCount === 1 ? '' : 's'} were identified. These are not treated as achieved sales.</p>}
            </div>
          )}
        </section>

        {acquisition && (
          <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
            <h2 className="text-xl font-bold">Break-Even Analysis</h2>
            <p className="mt-2 text-sm text-[#64748B]">Shows how quickly annual appreciation would mathematically recover the known transfer-duty component of the acquisition cost. It is not a property-price forecast.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {acquisition.breakEven.map(x => <div key={x.rate} className="rounded-2xl border border-[#E2E8F0] p-4"><p className="text-xs uppercase text-[#94A3B8]">{x.rate}% annual appreciation</p><p className="mt-2 text-2xl font-bold">{x.years === null ? '—' : `${x.years.toFixed(1)} yrs`}</p></div>)}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><Home className="h-5 w-5 text-[#2563EB]" /><h2 className="text-xl font-bold">Property Anatomy™</h2></div>
          <p className="mt-2 text-sm text-[#64748B]">Physical characteristics are translated into buyer signals only where the property evidence supports them.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusRow label="Bedrooms" state={facts.bedrooms !== null ? 'verified' : 'unknown'} detail={text(facts.bedrooms)} />
            <StatusRow label="Bathrooms" state={facts.bathrooms !== null ? 'verified' : 'unknown'} detail={text(facts.bathrooms)} />
            <StatusRow label="Kitchens" state={facts.kitchens !== undefined && facts.kitchens !== null ? 'verified' : 'unknown'} detail={text(facts.kitchens)} />
            <StatusRow label="Reception rooms" state={facts.receptionRooms !== undefined && facts.receptionRooms !== null ? 'verified' : 'unknown'} detail={text(facts.receptionRooms)} />
            <StatusRow label="Floor area" state={facts.floorSizeM2 !== null ? 'verified' : 'missing'} detail={facts.floorSizeM2 ? String(facts.floorSizeM2) + ' m²' : 'Required for R/m² analysis'} />
            <StatusRow label="Land area" state={facts.landSizeM2 !== null ? 'verified' : 'missing'} detail={facts.landSizeM2 ? String(facts.landSizeM2) + ' m²' : 'Property evidence required'} />
            <StatusRow label="Parking" state={facts.parking !== null ? 'verified' : 'unknown'} detail={facts.parkingDetails?.length ? facts.parkingDetails.join(' · ') : text(facts.parking)} />
            <StatusRow label="Pets" state={facts.petsAllowed !== undefined && facts.petsAllowed !== null ? 'verified' : 'unknown'} detail={yesNo(facts.petsAllowed)} />
            <StatusRow label="Flatlet" state={facts.flatlet !== undefined && facts.flatlet !== null ? 'verified' : 'unknown'} detail={facts.flatlet === true ? 'Advertised' : 'Not advertised'} />
            <StatusRow label="Flooring" state={facts.flooring?.length ? 'verified' : 'unknown'} detail={facts.flooring?.length ? facts.flooring.join(' · ') : 'Not verified'} />
            <StatusRow label="Backup water" state={facts.backupWater?.length ? 'verified' : 'unknown'} detail={facts.backupWater?.length ? facts.backupWater.join(' · ') : 'Not verified'} />
            <StatusRow label="Backup power" state={facts.backupPower?.length ? 'verified' : 'unknown'} detail={facts.backupPower?.length ? facts.backupPower.join(' · ') : 'Not verified'} />
            <StatusRow label="Garden" state={facts.hasGarden !== null ? 'verified' : 'unknown'} detail={yesNo(facts.hasGarden)} />
            <StatusRow label="Fibre" state={facts.hasFibre !== null ? 'verified' : 'unknown'} detail={yesNo(facts.hasFibre)} />
            <StatusRow label="Solar / backup" state={facts.hasSolar !== null || facts.hasBatteryBackup !== null ? 'verified' : 'unknown'} detail={facts.hasSolar === true || facts.hasBatteryBackup === true ? 'Indicated' : 'Not verified'} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Listing identity" state={facts.listingNumber ? 'verified' : 'unknown'} detail={facts.listingNumber ? 'Property24 #' + facts.listingNumber : 'Not verified'} />
            <StatusRow label="Listing date" state={facts.listingDate ? 'verified' : 'unknown'} detail={text(facts.listingDate)} />
          </div>
          <div className="mt-5 rounded-2xl border border-[#DCE6F7] bg-[#F7FAFF] p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">What these listing facts mean</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#475569]">
              {facts.flatlet === true && <p><strong>Flatlet:</strong> The listing advertises a flatlet. EiX does not assign rental income to it. Confirm approval, access, utilities and condition before treating it as financial value.</p>}
              {(facts.backupPower?.length || facts.backupWater?.length) && <p><strong>Resilience:</strong> The listing advertises {facts.backupPower?.join(' and ') || 'backup power'}{facts.backupWater?.length ? ' and ' + facts.backupWater.join(' and ') : ''}. Confirm capacity, ownership, installation, condition and what is actually supported.</p>}
              {facts.parkingDetails?.length && <p><strong>Parking:</strong> {facts.parkingDetails.join(' and ')} are advertised. Confirm allocation, dimensions and whether each space is exclusive, shared or merely practical parking.</p>}
              {facts.floorSizeM2 && price ? <p><strong>Price intensity:</strong> The asking price implies approximately {money(Math.round(price / facts.floorSizeM2))} per m² of advertised floor area. This is a comparison input, not a price-fairness conclusion.</p> : null}
              {facts.ratesAndTaxesCents !== null && <p><strong>Known recurring cost:</strong> Property24 supplies rates of {money(facts.ratesAndTaxesCents)}. Confirm the latest municipal account, arrears and current charges before relying on it.</p>}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2563EB]">Property DNA™</p>
          <h2 className="mt-1 text-xl font-bold">Buyer signals from the available property evidence</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusRow label="Owner-occupier fit" state={facts.bedrooms !== null && facts.bathrooms !== null ? 'verified' : 'unknown'} detail="Profile established only from supplied property facts." />
            <StatusRow label="Investment" state={report.rental_yield_percent !== null ? 'verified' : 'unknown'} detail={report.rental_yield_percent !== null ? String(report.rental_yield_percent) + '% rental yield input' : 'Rental evidence required'} />
            <StatusRow label="Outdoor living" state={facts.hasGarden === true ? 'verified' : 'unknown'} detail={facts.hasGarden === true ? 'Garden indicated' : 'Evidence required'} />
            <StatusRow label="Market certainty" state={achievedCount >= 3 ? 'verified' : 'missing'} detail={achievedCount >= 3 ? 'Comparable evidence available' : 'Achieved-sale evidence limited'} />
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><Home className="h-5 w-5 text-[#2563EB]" /><h2 className="text-xl font-bold">Neighbourhood DNA™</h2></div>
          <p className="mt-2 text-sm text-[#64748B]">Location intelligence is shown only where the report contains supporting evidence. EiX does not manufacture neighbourhood scores from missing data.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Location', listingArea || 'Location not verified'],
              ['Province', neighbourhood.location.province || facts.province || 'Not verified'],
              ['Transport', neighbourhoodSummary(neighbourhood.transport)],
              ['Schools / healthcare', neighbourhoodSummary(neighbourhood.schoolsHealthcare)],
              ['Lifestyle / retail', neighbourhoodSummary(neighbourhood.lifestyleRetail)],
              ['Safety indicators', neighbourhoodSummary(neighbourhood.safetyIndicators, 'No public safety infrastructure evidence found; no safety score inferred')],
              ['Parks / recreation', neighbourhoodSummary(neighbourhood.parksRecreation)],
              ['Market momentum', marketMomentum],
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E2E8F0] p-4"><p className="text-xs uppercase tracking-wider text-[#94A3B8]">{label}</p><p className="mt-2 font-semibold leading-relaxed">{value}</p></div>)}
          </div>
          {Array.isArray(facts.pointsOfInterest) && facts.pointsOfInterest.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">Property24-listed nearby places</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {facts.pointsOfInterest.slice(0, 8).map((poi: any) => (
                  <div key={poi.name + poi.distanceKm} className="rounded-xl border border-[#E2E8F0] bg-white p-3">
                    <p className="text-sm font-semibold">{poi.name}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{poi.category || 'Point of interest'} · {poi.distanceKm} km</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#94A3B8]">These distances are reported by the supplied Property24 listing. They are proximity evidence, not an EiX assessment of quality, safety or suitability.</p>
            </div>
          )}
          <p className="mt-4 text-xs leading-relaxed text-[#94A3B8]">Location and nearby-place evidence is sourced from OpenStreetMap data where available. When an exact street address is unavailable, EiX uses the listing's stated area (for example, Camps Bay) as a neighbourhood anchor; nearby-place distances are approximate straight-line distances from that geocoded area. Safety indicators show nearby public-safety infrastructure only; EiX does not convert this into a crime or safety score.</p>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-[#F59E0B]" /><h2 className="text-xl font-bold">Risks & Missing Evidence</h2></div>
          <div className="mt-5 space-y-3">
            {(limitations.length ? limitations : ['No material limitations were recorded in the report.']).map((item: string) => <div key={item} className="flex gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" /><p className="text-sm leading-relaxed text-[#475569]">{item}</p></div>)}
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-[#2563EB]" /><h2 className="text-xl font-bold">Buyer Document Pack</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <StatusRow label="Listing / property facts" state={factCompleteness >= 6 ? 'verified' : 'unknown'} />
            <StatusRow label="Comparable sales evidence" state={achievedCount >= 3 ? 'verified' : 'missing'} />
            <StatusRow label="Approved building plans" state={statusFromLimitations(limitations, ['building plans']) === 'missing' ? 'missing' : 'unknown'} />
            <StatusRow label="Compliance certificates" state={statusFromLimitations(limitations, ['compliance']) === 'missing' ? 'missing' : 'unknown'} />
            <StatusRow label="Independent inspection" state={statusFromLimitations(limitations, ['inspection']) === 'missing' ? 'missing' : 'unknown'} />
            <StatusRow label="Title / heritage checks" state={statusFromLimitations(limitations, ['title', 'heritage']) === 'missing' ? 'missing' : 'unknown'} />
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2563EB]">Your next move</p>
          <h2 className="mt-1 text-2xl font-bold">Questions for the agent</h2>
          <ol className="mt-5 space-y-3">
            {[
              'Can you provide 3–6 recent achieved comparable sales for genuinely similar properties nearby?',
              'What is the measured floor area, and can it be supported by plans or another reliable record?',
              'Can you provide the approved building plans and confirm they match the current property?',
              'Are all additions and alterations approved, and are the required compliance certificates current?',
              'Are there any known structural defects, notices, disputes, servitudes or title restrictions?',
              'Can you confirm the latest municipal rates account and any outstanding amounts?',
              'What exactly is included in the sale, and are there any conditions or occupation terms I should know before making an offer?',
            ].map((q, i) => <li key={q} className="flex gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-300/15 text-xs font-bold text-[#0B1220]">{i + 1}</span><span className="text-sm leading-relaxed text-[#475569]">{q}</span></li>)}
          </ol>
          <div className="mt-6 rounded-2xl border border-[#E2E8F0] bg-black/10 p-5">
            <p className="text-xs uppercase tracking-wider text-[#94A3B8]">EiX Buyer Position</p>
            <p className="mt-2 text-xl font-bold">{state.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#64748B]">{state.detail}</p>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#2563EB]">Evidence audit</p>
              <h2 className="mt-1 text-xl font-bold">What EiX actually knows</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">Every material fact is shown with its current evidence state. Missing information is left missing rather than inferred.</p>
            </div>
            <span className="rounded-full border border-[#E2E8F0] px-3 py-1 text-xs font-semibold">{evidence.length} recorded</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Asking price', facts.askingPriceCents, 'supplied / extracted'],
              ['Bedrooms', facts.bedrooms, 'supplied / extracted'],
              ['Bathrooms', facts.bathrooms, 'supplied / extracted'],
              ['Floor area', facts.floorSizeM2, 'required for R/m² analysis'],
              ['Erf / land area', facts.landSizeM2, 'property evidence'],
              ['Rates', facts.ratesAndTaxesCents, 'municipal cost input'],
              ['Levy', facts.leviesCents, 'body corporate cost input'],
              ['Kitchens', facts.kitchens, 'listing-supplied room count'],
              ['Reception rooms', facts.receptionRooms, 'listing-supplied room count'],
              ['Parking details', facts.parkingDetails?.join(' · ') || null, 'listing-supplied parking configuration'],
              ['Flatlet', facts.flatlet, 'listing-supplied feature; approval not verified'],
              ['Backup water', facts.backupWater?.join(' · ') || null, 'listing-supplied resilience feature'],
              ['Backup power', facts.backupPower?.join(' · ') || null, 'listing-supplied resilience feature'],
              ['Listing number', facts.listingNumber, 'source identity'],
              ['Listing date', facts.listingDate, 'source freshness'],
              ['P24 calculator repayment', facts.property24MonthlyRepaymentCents, 'source-provided scenario; not a bank offer'],
              ['P24 calculator once-off costs', facts.property24OnceOffCostsCents, 'source-provided scenario'],
              ['P24 minimum gross income', facts.property24MinimumGrossMonthlyIncomeCents, 'source-provided scenario'],
              ['Nearby places', Array.isArray(facts.pointsOfInterest) ? facts.pointsOfInterest.length : null, 'Property24-listed proximity evidence'],
              ['Comparable sales', achievedCount, '3+ required for price fairness'],
            ].map(([label, value, basis]) => {
              const present = value !== null && value !== undefined && value !== '' && !(typeof value === 'number' && value === 0 && label !== 'Comparable sales');
              const display = label === 'Asking price' || label === 'Rates' || label === 'Levy'
                ? (present ? money(value) : 'Not verified')
                : (present ? String(value) : 'Not verified');
              return (
                <div key={label as string} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{label as string}</p>
                    <span className={present ? 'text-xs font-semibold text-[#2563EB]' : 'text-xs font-semibold text-[#F59E0B]'}>{present ? 'AVAILABLE' : 'MISSING'}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold">{display}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{basis as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#2563EB]" /><h2 className="text-xl font-bold">Offer Plan</h2></div>
          <p className="mt-2 text-sm leading-relaxed text-[#64748B]">The report turns the evidence gaps into concrete actions before you commit to an offer.</p>
          <div className="mt-5 grid gap-3">
            {[
              achievedCount < 3
                ? 'Obtain 3–6 recent achieved sales of genuinely comparable properties before treating the asking price as market-supported.'
                : 'Review the achieved-sale comparables and confirm the subject property differences justify any price gap.',
              !facts.floorSizeM2
                ? 'Get the measured floor area so R/m² comparisons can be tested.'
                : 'Confirm the stated floor area against plans or another reliable property record.',
              'Make the offer conditional on satisfactory building inspection, required compliance certificates and approved plans where applicable.',
              'Confirm the latest municipal rates account and any outstanding amounts before signing.',
            ].map((step, i) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-300/15 text-xs font-bold text-[#0B1220]">{i + 1}</span>
                <p className="text-sm leading-relaxed text-[#475569]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#F5D9A6] bg-[#FFF8EB] p-4 text-sm text-[#92400E]/80">
            EiX does not turn an evidence gap into a price opinion. If the required market evidence is missing, the correct next action is to gather it.
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#DCE6F7] bg-gradient-to-br from-teal-300/[.10] to-white/[.03] p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#2563EB]">EiX Buyer Intelligence Report™</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Evidence before opinion.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[#64748B]">EiX helps buyers make decisions with verified evidence, transparent assumptions and clear next steps—not manufactured certainty.</p>
        </section>

        <section className="mt-5 rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.05)] sm:p-7">
          <div className="flex items-center gap-2"><Info className="h-5 w-5 text-[#64748B]" /><h2 className="text-lg font-bold">Method & limitations</h2></div>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#64748B]">
            {(report.assumptions || []).map((a: string) => <li key={a}>• {a}</li>)}
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
