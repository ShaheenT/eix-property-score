import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ReportPrintButton } from '@/components/report-print-button';

function currency(cents: number | null | undefined): string {
  return typeof cents !== 'number' || !Number.isFinite(cents)
    ? 'Not verified'
    : `R ${(cents / 100).toLocaleString('en-ZA')}`;
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

function percent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Not available';
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
    .select('id, status, report_type, investment_score, ai_confidence, property_facts, property_evidence, score_breakdown, assumptions, limitations, rental_yield_percent, bond_monthly_payment_cents, bond_loan_amount_cents, risk_level, recommendation, confidence_label, access_token, processed_at, investor_analysis, international_buyer_analysis')
    .eq('id', id)
    .eq('access_token', token)
    .single();

  if (!report || !['completed', 'sent'].includes(report.status)) notFound();

  const facts = (report.property_facts || {}) as Record<string, any>;
  const evidence = Array.isArray(report.property_evidence) ? report.property_evidence : [];
  const limitations = Array.isArray(report.limitations) ? report.limitations : [];
  const assumptions = Array.isArray(report.assumptions) ? report.assumptions : [];
  const score = (report.score_breakdown || {}) as Record<string, number>;
  const isPro = report.report_type === 'investor_report_pro';
  const investor = (report.investor_analysis || {}) as Record<string, any>;
  const internationalBuyer = (report.international_buyer_analysis || null) as Record<string, any> | null;

  const verifiedFacts: Array<[string, string]> = [
    ['Asking Price', currency(typeof facts.askingPriceCents === 'number' ? facts.askingPriceCents : null)],
    ['Property Type', text(facts.propertyType)],
    ['Bedrooms', text(facts.bedrooms)],
    ['Bathrooms', text(facts.bathrooms)],
    ['Floor Size', typeof facts.floorSizeM2 === 'number' ? `${facts.floorSizeM2} m²` : 'Not verified'],
    ['Land Size', typeof facts.landSizeM2 === 'number' && facts.landSizeM2 > 1 ? `${facts.landSizeM2} m²` : 'Not verified'],
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
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-12 w-auto" />
          <ReportPrintButton />
        </div>

        <section className="glass-strong rounded-3xl p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-400">{isPro ? 'EiX Investor Report Pro™' : 'EiX Property Score™ Report'}</p>
          <h1 className="mt-3 text-3xl font-bold">{text(facts.title, 'Property Analysis')}</h1>
          <p className="mt-2 text-white/60">{text(facts.address, 'Address not verified')}</p>

          {!isPro && (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-wider text-white/40">EiX Property Score</p>
                <p className="mt-2 text-4xl font-bold text-teal-400">{report.investment_score ?? '—'}<span className="text-lg text-white/40">/100</span></p>
                <p className="mt-1 text-xs text-white/40">{score.marketComparableCount > 0 ? 'Market-supported' : 'Evidence-limited'}</p>
              </div>
              <div className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-wider text-white/40">Evidence Confidence</p>
                <p className="mt-2 text-3xl font-bold">{report.ai_confidence ?? 0}%</p>
                <p className="text-sm text-white/50">{report.confidence_label || 'Unknown'}</p>
              </div>
              <div className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-wider text-white/40">EiX Assessment</p>
                <p className="mt-2 text-2xl font-bold text-teal-400">{report.recommendation || 'Insufficient Data'}</p>
                <p className="mt-1 text-xs text-white/40">Risk: {report.risk_level || 'Unrated'}</p>
              </div>
            </div>
          )}
        </section>

        {!isPro && (
          <>
            <section className="mt-6 glass rounded-2xl p-6">
              <h2 className="text-lg font-bold">EiX Assessment</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                This score is an evidence-backed property assessment. It combines verified listing evidence, property-fact completeness, financial clarity and, where available, active comparable asking-price evidence. It is not a formal valuation.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Evidence</p><p className="mt-1 text-xl font-semibold">{text(score.evidence, '0')}/100</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Property Fundamentals</p><p className="mt-1 text-xl font-semibold">{text(score.fundamentals, '0')}/100</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Financial Clarity</p><p className="mt-1 text-xl font-semibold">{text(score.financialClarity, '0')}/100</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Market Position</p><p className="mt-1 text-xl font-semibold">{score.marketComparableCount > 0 ? `${text(score.marketPosition, '0')}/100` : 'Evidence-limited'}</p></div>
              </div>
            </section>

            <section className="mt-6 glass rounded-2xl p-6">
              <h2 className="text-lg font-bold">Market Intelligence</h2>
              <p className="mt-2 text-sm text-white/60">Active asking-price comparison. This is market evidence, not a formal valuation.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Verified Comparables</p><p className="mt-1 text-xl font-semibold">{score.marketComparableCount || 0}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Comparable Median</p><p className="mt-1 text-xl font-semibold">{score.marketMedianAskingPriceCents ? currency(score.marketMedianAskingPriceCents) : 'Not available'}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Subject vs Median</p><p className="mt-1 text-xl font-semibold">{score.marketComparableCount > 0 ? percent(score.subjectVsMedianPercent) : 'Not available'}</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Subject Price / m²</p><p className="mt-1 text-xl font-semibold">{score.subjectPricePerM2Cents ? currency(score.subjectPricePerM2Cents) : 'Not available'}</p></div>
              </div>
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">What this means</p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  {score.marketComparableCount > 0
                    ? `The supplied property is ${percent(score.subjectVsMedianPercent)} relative to the active comparable asking-price median. Use this as a negotiation signal, not as proof of intrinsic value.`
                    : 'EiX could not establish a sufficiently verified comparable set for this report. The score is therefore deliberately capped and marked evidence-limited rather than presenting an unsupported market conclusion.'}
                </p>
              </div>
            </section>
          </>
        )}

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">Verified Property Facts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {verifiedFacts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-white/40">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/40">Evidence records attached: {evidence.length}</p>
        </section>

        {internationalBuyer?.profile?.buyerType === 'international' && (
          <section className="mt-6 glass rounded-2xl p-6">
            <h2 className="text-lg font-bold">International Buyer Intelligence</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">Evidence-led intelligence for international purchasers. This section does not constitute legal, tax, immigration or formal valuation advice.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Buyer Country</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerCountry)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Purpose</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerPurpose)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Budget</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerBudget)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">Market Position</p><p className="mt-1 font-semibold">{text(internationalBuyer.marketPosition)}</p></div>
            </div>
            {Array.isArray(internationalBuyer.evidenceGaps) && internationalBuyer.evidenceGaps.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Evidence Gaps</h3><ul className="mt-3 space-y-2 text-sm text-white/60">{internationalBuyer.evidenceGaps.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></div>}
            {Array.isArray(internationalBuyer.dueDiligenceQuestions) && internationalBuyer.dueDiligenceQuestions.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">International Buyer Due Diligence</h3><ul className="mt-3 space-y-2 text-sm text-white/60">{internationalBuyer.dueDiligenceQuestions.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></div>}
          </section>
        )}

        {isPro ? (
          <>
            <section className="mt-6 glass rounded-2xl p-6">
              <h2 className="text-lg font-bold">Investor Analysis</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">This analysis evaluates verified listing evidence, acquisition assumptions, available market evidence and explicitly identified information gaps.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {['marketIntelligence', 'rentalDemand', 'growthOutlook', 'exitStrategy'].map((key) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/40">{key.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 font-semibold">{statusLabel(investor[key]?.status)}</p></div>
                ))}
              </div>
            </section>
            {proSections.map(([title, section]) => section && <section key={title} className="mt-6 glass rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">{statusLabel(section?.status)}</span></div>
              <p className="mt-3 text-sm leading-relaxed text-white/60">{text(section?.summary)}</p>
              {Array.isArray(section?.opportunities) && section.opportunities.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/70">{section.opportunities.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul>}
              {Array.isArray(section?.items) && section.items.length > 0 && <div className="mt-4 space-y-3">{section.items.map((item: any, index: number) => <div key={`${String(item?.risk)}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">{text(item?.risk)}</p><p className="mt-1 text-sm text-white/50">{text(item?.reason)}</p><p className="mt-2 text-xs uppercase tracking-wider text-white/30">Severity: {text(item?.severity)}</p></div>)}</div>}
            </section>)}
            {investor.acquisitionIntelligence && <section className="mt-6 glass rounded-2xl p-6"><h2 className="text-lg font-bold">Acquisition Intelligence</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">10% Deposit</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.depositCents)}</p></div><div><p className="text-xs uppercase text-white/40">Transfer Duty</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.transferDutyCents)}</p></div><div><p className="text-xs uppercase text-white/40">90% Loan</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.loanAmountCents)}</p></div><div><p className="text-xs uppercase text-white/40">Monthly Bond</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.bondMonthlyPaymentCents)}</p></div></div></section>}
          </>
        ) : (
          <section className="mt-6 glass rounded-2xl p-6">
            <h2 className="text-lg font-bold">Financial Scenarios</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs uppercase text-white/40">Gross Rental Yield</p><p className="mt-1 text-xl font-semibold">{report.rental_yield_percent === null ? 'Not available — verified rent required' : `${report.rental_yield_percent}%`}</p></div>
              <div><p className="text-xs uppercase text-white/40">BondMatch Monthly Payment</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_monthly_payment_cents)}</p></div>
              <div><p className="text-xs uppercase text-white/40">BondMatch Loan Amount</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_loan_amount_cents)}</p></div>
              <div><p className="text-xs uppercase text-white/40">Risk</p><p className="mt-1 text-xl font-semibold">{report.risk_level || 'Unrated'}</p></div>
            </div>
          </section>
        )}

        <section className="mt-6 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold">Due Diligence & Evidence Gaps</h2>
          <p className="mt-2 text-sm text-white/60">These are the items that should be verified before relying on the report for a transaction decision.</p>
          {limitations.length > 0 ? <ul className="mt-4 space-y-2 text-sm text-white/60">{limitations.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul> : <p className="mt-4 text-sm text-white/60">No material evidence gaps were recorded.</p>}
          {assumptions.length > 0 && <><h3 className="mt-6 text-sm font-semibold">Scenario assumptions</h3><ul className="mt-3 space-y-2 text-sm text-white/60">{assumptions.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></>}
        </section>

        <p className="mt-8 pb-8 text-center text-xs text-white/30">EiX Property Score™ · Evidence-first analysis · Generated {report.processed_at ? new Date(report.processed_at).toLocaleString('en-ZA') : 'recently'}</p>
      </div>
    </main>
  );
}
