import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ReportPrintButton } from '@/components/report-print-button';

function currency(cents: number | null): string {
  return cents === null ? 'Not verified' : `R ${(cents / 100).toLocaleString('en-ZA')}`;
}

function yesNo(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not verified';
}

function text(value: unknown, fallback = 'Not available'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function statusLabel(value: unknown): string {
  return text(value, 'INSUFFICIENT_DATA');
}

export default async function CustomerReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) notFound();

  const { data: report } = await supabaseAdmin
    .from('reports')
    .select('id, status, report_type, investment_score, ai_confidence, property_facts, property_evidence, score_breakdown, assumptions, limitations, rental_yield_percent, bond_monthly_payment_cents, bond_loan_amount_cents, risk_level, recommendation, confidence_label, access_token, processed_at, investor_analysis')
    .eq('id', id)
    .eq('access_token', token)
    .single();

  if (!report || !['completed', 'sent'].includes(report.status)) notFound();

  const facts = (report.property_facts || {}) as Record<string, unknown>;
  const evidence = Array.isArray(report.property_evidence) ? report.property_evidence : [];
  const limitations = Array.isArray(report.limitations) ? report.limitations : [];
  const assumptions = Array.isArray(report.assumptions) ? report.assumptions : [];
  const isPro = report.report_type === 'investor_report_pro';
  const investor = (report.investor_analysis || {}) as Record<string, any>;

  const verifiedFacts: Array<[string, string]> = [
    ['Asking Price', currency(typeof facts.askingPriceCents === 'number' ? facts.askingPriceCents : null)],
    ['Property Type', text(facts.propertyType)],
    ['Bedrooms', text(facts.bedrooms)],
    ['Bathrooms', text(facts.bathrooms)],
    ['Floor Size', facts.floorSizeM2 ? `${facts.floorSizeM2} m²` : 'Not verified'],
    ['Land Size', facts.landSizeM2 ? `${facts.landSizeM2} m²` : 'Not verified'],
    ['Garages', text(facts.garages)],
    ['Parking', text(facts.parking)],
    ['Study', yesNo(facts.hasStudy)],
    ['Pool', yesNo(facts.hasPool)],
    ['Garden', yesNo(facts.hasGarden)],
    ['Fibre', yesNo(facts.hasFibre)],
    ['Solar', yesNo(facts.hasSolar)],
    ['Backup Power', yesNo(facts.hasBatteryBackup)],
    ['Levies', currency(typeof facts.leviesCents === 'number' ? facts.leviesCents : null)],
    ['Rates & Taxes', currency(typeof facts.ratesAndTaxesCents === 'number' ? facts.ratesAndTaxesCents : null)],
  ];

  const proSections = [
    ['Comparable Market Evidence', investor.comparableSales],
    ['Rental Demand', investor.rentalDemand],
    ['Negotiation Opportunities', investor.negotiationOpportunities],
    ['Investment Risks', investor.investmentRisks],
    ['Growth Outlook', investor.growthOutlook],
    ['Exit Strategy', investor.exitStrategy],
  ] as const;

  return (
    <main className="min-h-screen bg-midnight px-6 py-10 text-white sm:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-12 w-auto" />
          <ReportPrintButton />
        </div>

        <section className="glass-strong rounded-3xl p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">{isPro ? 'EiX Investor Report Pro™' : 'EiX Property Score™ Report'}</p>
          <h1 className="mt-3 text-3xl font-bold">{text(facts.title, 'Property Analysis')}</h1>
          <p className="mt-2 text-white/60">{text(facts.address, 'Address not verified')}</p>
          {!isPro && <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="glass rounded-2xl p-5"><p className="text-xs uppercase text-white/40">Investment Score</p><p className="mt-2 text-4xl font-bold text-teal-400">{report.investment_score ?? '—'}<span className="text-lg text-white/40">/100</span></p></div>
            <div className="glass rounded-2xl p-5"><p className="text-xs uppercase text-white/40">Confidence</p><p className="mt-2 text-3xl font-bold">{report.ai_confidence ?? 0}%</p><p className="text-sm text-white/50">{report.confidence_label || 'Unknown'}</p></div>
            <div className="glass rounded-2xl p-5"><p className="text-xs uppercase text-white/40">Recommendation</p><p className="mt-2 text-2xl font-bold text-teal-400">{report.recommendation || 'Insufficient Data'}</p></div>
          </div>}
        </section>

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">Verified Property Facts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {verifiedFacts.map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
          </div>
          <p className="mt-5 text-xs text-white/40">Evidence records attached: {evidence.length}</p>
        </section>

        {isPro ? <>
          <section className="mt-6 glass rounded-2xl p-6">
            <h2 className="text-lg font-bold">Investor Analysis</h2>
            <p className="mt-2 text-sm text-white/50">Each section is labelled according to the strength of the evidence available at report generation.</p>
          </section>
          {proSections.map(([title, section]) => <section key={title} className="mt-6 glass rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gold-300">{statusLabel(section?.status)}</span></div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">{text(section?.summary)}</p>
            {Array.isArray(section?.opportunities) && section.opportunities.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/70">{section.opportunities.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul>}
            {Array.isArray(section?.items) && section.items.length > 0 && <div className="mt-4 space-y-3">{section.items.map((item: any, index: number) => <div key={`${String(item?.risk)}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">{text(item?.risk)}</p><p className="mt-1 text-sm text-white/50">{text(item?.reason)}</p><p className="mt-2 text-xs uppercase tracking-wider text-white/30">Severity: {text(item?.severity)}</p></div>)}</div>}
            {title === 'Comparable Market Evidence' && <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-xs uppercase text-white/40">Comparable count</p><p className="mt-1 font-semibold">{text(section?.comparableCount, '0')}</p></div><div><p className="text-xs uppercase text-white/40">Median asking price</p><p className="mt-1 font-semibold">{currency(typeof section?.medianAskingPriceCents === 'number' ? section.medianAskingPriceCents : null)}</p></div><div><p className="text-xs uppercase text-white/40">Subject vs median</p><p className="mt-1 font-semibold">{section?.subjectVsMedianPercent === null || section?.subjectVsMedianPercent === undefined ? 'Not available' : `${section.subjectVsMedianPercent}%`}</p></div></div>}
            {title === 'Rental Demand' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">Verified rental evidence</p><p className="mt-1 font-semibold">{yesNo(section?.verifiedRentalEvidence)}</p></div><div><p className="text-xs uppercase text-white/40">Rental yield</p><p className="mt-1 font-semibold">{section?.rentalYieldPercent === null || section?.rentalYieldPercent === undefined ? 'Not available' : `${section.rentalYieldPercent}%`}</p></div></div>}
            {title === 'Growth Outlook' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">Verified growth evidence</p><p className="mt-1 font-semibold">{yesNo(section?.verifiedGrowthEvidence)}</p></div><div><p className="text-xs uppercase text-white/40">Projected growth</p><p className="mt-1 font-semibold">{section?.projectedGrowthPercent === null || section?.projectedGrowthPercent === undefined ? 'Not available' : `${section.projectedGrowthPercent}%`}</p></div></div>}
            {title === 'Exit Strategy' && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">Estimated exit value</p><p className="mt-1 font-semibold">{currency(typeof section?.estimatedExitValueCents === 'number' ? section.estimatedExitValueCents : null)}</p></div><div><p className="text-xs uppercase text-white/40">Holding period</p><p className="mt-1 font-semibold">{section?.estimatedHoldingPeriodYears === null || section?.estimatedHoldingPeriodYears === undefined ? 'Not available' : `${section.estimatedHoldingPeriodYears} years`}</p></div></div>}
            {title === 'Exit Strategy' && <p className="mt-4 text-sm text-white/60">{text(section?.strategy)}</p>}
          </section>)}
          {investor.acquisitionIntelligence && <section className="mt-6 glass rounded-2xl p-6"><h2 className="text-lg font-bold">Acquisition Intelligence</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">10% Deposit</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.depositCents ?? null)}</p></div><div><p className="text-xs uppercase text-white/40">Transfer Duty</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.transferDutyCents ?? null)}</p></div><div><p className="text-xs uppercase text-white/40">90% Loan</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.bondLoanAmountCents ?? null)}</p></div><div><p className="text-xs uppercase text-white/40">Monthly Bond</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.bondMonthlyPaymentCents ?? null)}</p></div></div></section>}
        </> : <section className="mt-6 glass rounded-2xl p-6"><h2 className="text-lg font-bold">Financial Scenarios</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">Gross Rental Yield</p><p className="mt-1 text-xl font-semibold">{report.rental_yield_percent === null ? 'Not available — verified rent required' : `${report.rental_yield_percent}%`}</p></div><div><p className="text-xs uppercase text-white/40">BondMatch Monthly Payment</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_monthly_payment_cents)}</p></div><div><p className="text-xs uppercase text-white/40">BondMatch Loan Amount</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_loan_amount_cents)}</p></div><div><p className="text-xs uppercase text-white/40">Risk</p><p className="mt-1 text-xl font-semibold">{report.risk_level || 'Unrated'}</p></div></div></section>}

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">What EiX Could Not Verify</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/60">{limitations.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul>
          {assumptions.length > 0 && <><h3 className="mt-6 text-sm font-semibold">Scenario assumptions</h3><ul className="mt-3 space-y-2 text-sm text-white/60">{assumptions.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></>}
        </section>

        <p className="mt-8 pb-8 text-center text-xs text-white/30">EiX Property Score™ · Evidence-first analysis · Generated {report.processed_at ? new Date(report.processed_at).toLocaleString('en-ZA') : 'recently'}</p>
      </div>
    </main>
  );
}
