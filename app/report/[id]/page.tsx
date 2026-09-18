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

function wholeNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-ZA') : 'Not verified';
}

function pricePerM2(askingPriceCents: unknown, floorSizeM2: unknown): string {
  if (
    typeof askingPriceCents !== 'number' ||
    !Number.isFinite(askingPriceCents) ||
    typeof floorSizeM2 !== 'number' ||
    !Number.isFinite(floorSizeM2) ||
    floorSizeM2 <= 0
  ) {
    return 'Not available';
  }

  return currency(Math.round(askingPriceCents / floorSizeM2));
}

function coveragePercent(floorSizeM2: unknown, landSizeM2: unknown): string {
  if (
    typeof floorSizeM2 !== 'number' ||
    !Number.isFinite(floorSizeM2) ||
    typeof landSizeM2 !== 'number' ||
    !Number.isFinite(landSizeM2) ||
    landSizeM2 <= 0
  ) {
    return 'Not available';
  }

  return `${((floorSizeM2 / landSizeM2) * 100).toFixed(0)}%`;
}

function findingTone(value: 'positive' | 'attention' | 'neutral'): string {
  if (value === 'positive') return 'border-teal-400/20 bg-teal-400/5';
  if (value === 'attention') return 'border-amber-300/20 bg-amber-300/5';
  return 'border-white/10 bg-white/5';
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
  const score = (report.score_breakdown || {}) as Record<string, any>;
  const isPro = report.report_type === 'investor_report_pro';
  const investor = (report.investor_analysis || {}) as Record<string, any>;
  const internationalBuyer = (report.international_buyer_analysis || null) as Record<string, any> | null;

  const askingPriceCents = typeof facts.askingPriceCents === 'number' ? facts.askingPriceCents : null;
  const floorSizeM2 = typeof facts.floorSizeM2 === 'number' ? facts.floorSizeM2 : null;
  const landSizeM2 = typeof facts.landSizeM2 === 'number' ? facts.landSizeM2 : null;
  const comparableCount = Number(score.marketComparableCount || 0);
  const subjectPricePerM2 = score.subjectPricePerM2Cents ? currency(score.subjectPricePerM2Cents) : pricePerM2(askingPriceCents, floorSizeM2);
  const subjectVsMedian = comparableCount > 0 ? percent(score.subjectVsMedianPercent) : 'Not established';
  const address = text(facts.address, 'Address not verified');
  const propertyTitle = text(facts.title, 'Property Analysis');

  const verifiedFacts: Array<[string, string]> = [
    ['Asking Price', currency(askingPriceCents)],
    ['Property Type', text(facts.propertyType)],
    ['Bedrooms', text(facts.bedrooms)],
    ['Bathrooms', text(facts.bathrooms)],
    ['Floor Size', floorSizeM2 !== null ? `${wholeNumber(floorSizeM2)} m²` : 'Not verified'],
    ['Land Size', landSizeM2 !== null ? `${wholeNumber(landSizeM2)} m²` : 'Not verified'],
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

  const findings: Array<{ title: string; body: string; tone: 'positive' | 'attention' | 'neutral' }> = [];
  if (facts.hasGarden) findings.push({ title: 'Private outdoor space', body: 'A garden is recorded in the supplied property evidence, which can materially affect owner-occupier appeal.', tone: 'positive' });
  if (facts.parking !== null && facts.parking !== undefined) findings.push({ title: `${facts.parking} parking spaces`, body: 'Parking is explicitly recorded rather than inferred from the listing presentation.', tone: 'positive' });
  if (facts.hasFibre) findings.push({ title: 'Fibre connectivity', body: 'Fibre is recorded as available in the supplied property evidence.', tone: 'positive' });
  if (floorSizeM2 !== null && askingPriceCents !== null) findings.push({ title: `${subjectPricePerM2} asking price / m²`, body: 'EiX derives this from the supplied asking price and verified floor area. Use it as a comparison metric, not a valuation.', tone: 'neutral' });
  if (comparableCount === 0) findings.push({ title: 'Price position is unresolved', body: 'EiX does not have enough verified comparable asking-price evidence to establish whether R pricing is above, below or within the expected market range.', tone: 'attention' });
  if (facts.ratesAndTaxesCents !== null && facts.ratesAndTaxesCents !== undefined) findings.push({ title: `${currency(facts.ratesAndTaxesCents)} rates & taxes`, body: 'A recurring property cost is available for scenario planning.', tone: 'positive' });

  const buyerQuestions = [
    comparableCount === 0 ? 'Is the R asking price supported by comparable Observatory properties with reliable price and size evidence?' : 'How does the property compare with the verified comparable set?',
    report.rental_yield_percent === null ? 'What rent could this property realistically achieve, and what would the net rental position look like after operating costs?' : 'Does the rental yield remain attractive after realistic operating costs?',
    'Does the condition and renovation quality justify the asking price relative to comparable properties?',
    'Are there any additional recurring costs, restrictions, or property-specific obligations not visible in the supplied listing?',
    'What should be independently verified before making or accepting an offer?',
  ];

  const decisionHeadline = comparableCount === 0
    ? 'INTERESTING PROPERTY — PRICE REQUIRES VERIFICATION'
    : report.recommendation === 'Buy'
      ? 'BUY SIGNAL — REVIEW THE EVIDENCE'
      : report.recommendation === 'Consider'
        ? 'CONSIDER — REVIEW PRICE & EVIDENCE'
        : report.recommendation === 'Caution'
          ? 'CAUTION — INVESTIGATE BEFORE COMMITTING'
          : 'INSUFFICIENT EVIDENCE FOR A MARKET CONCLUSION';

  const decisionBody = comparableCount === 0
    ? `EiX can establish the core physical and financial profile of this property, but it cannot responsibly establish whether the asking price is fair without sufficiently verified comparable evidence. The key next question is whether the market supports the asking price.`
    : `EiX has established a comparable evidence set and uses it as a market signal. The result should be read alongside the property facts, financial scenario and due-diligence items below.`;

  const proSections = [
    ['Comparable Market Evidence', investor.comparableSales],
    ['Rental Demand', investor.rentalDemand],
    ['Negotiation Opportunities', investor.negotiationOpportunities],
    ['Investment Risks', investor.investmentRisks],
    ['Growth Outlook', investor.growthOutlook],
    ['Exit Strategy', investor.exitStrategy],
  ] as const;

  return (
    <main className="min-h-screen bg-midnight px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-11 w-auto" />
          <ReportPrintButton />
        </div>

        <section className="glass-strong rounded-3xl p-6 sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-400">
                {isPro ? 'EiX Investor Report Pro™' : 'EiX Property Score™ · Property Intelligence'}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{propertyTitle}</h1>
              <p className="mt-2 text-sm text-white/55">{address}</p>
              <p className="mt-4 text-sm text-white/45">Evidence-backed analysis · Generated {report.processed_at ? new Date(report.processed_at).toLocaleString('en-ZA') : 'recently'}</p>
            </div>
            {!isPro && (
              <div className="rounded-2xl border border-teal-400/20 bg-teal-400/5 px-5 py-4 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">EiX Property Score</p>
                <p className="mt-1 text-5xl font-bold text-teal-400">{report.investment_score ?? '—'}<span className="text-lg text-white/35">/100</span></p>
                <p className="mt-1 text-xs text-white/45">{report.confidence_label || 'Unknown'} confidence · {report.ai_confidence ?? 0}%</p>
              </div>
            )}
          </div>

          {!isPro && (
            <div className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/75">EiX Buyer Signal</p>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">{decisionHeadline}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">{decisionBody}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{report.risk_level || 'Unrated'} risk</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{comparableCount} verified comparables</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{evidence.length} evidence records</span>
              </div>
            </div>
          )}
        </section>

        {!isPro && (
          <>
            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">30-second decision brief</p>
                  <h2 className="mt-1 text-2xl font-bold">What EiX discovered</h2>
                </div>
                <p className="text-xs text-white/40">The listing provides facts. EiX interprets their decision impact.</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {findings.slice(0, 6).map((finding) => (
                  <div key={finding.title} className={`rounded-2xl border p-5 ${findingTone(finding.tone)}`}>
                    <p className="text-sm font-semibold">{finding.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{finding.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">EiX Property Anatomy™</p>
              <h2 className="mt-1 text-2xl font-bold">The property at a glance</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Asking', currency(askingPriceCents)],
                  ['Floor', floorSizeM2 !== null ? `${wholeNumber(floorSizeM2)} m²` : 'Not verified'],
                  ['Erf', landSizeM2 !== null ? `${wholeNumber(landSizeM2)} m²` : 'Not verified'],
                  ['Price / m²', subjectPricePerM2],
                  ['Bedrooms', text(facts.bedrooms)],
                  ['Bathrooms', text(facts.bathrooms)],
                  ['Parking', text(facts.parking)],
                  ['Garden', yesNo(facts.hasGarden)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">{label}</p>
                    <p className="mt-2 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/35">Building / erf relationship</p>
                    <p className="mt-1 text-lg font-semibold">{coveragePercent(floorSizeM2, landSizeM2)} of the erf is represented by the recorded floor area.</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">Derived metric</span>
                </div>
              </div>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">Price Intelligence</p>
              <h2 className="mt-1 text-2xl font-bold">The number that matters</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/35">Asking price</p>
                  <p className="mt-2 text-2xl font-bold">{currency(askingPriceCents)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/35">Subject price / m²</p>
                  <p className="mt-2 text-2xl font-bold">{subjectPricePerM2}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/35">Vs comparable median</p>
                  <p className="mt-2 text-2xl font-bold">{subjectVsMedian}</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5">
                <p className="text-sm font-semibold">{comparableCount > 0 ? 'Market signal' : 'The unresolved question'}</p>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  {comparableCount > 0
                    ? `EiX places the subject at ${subjectVsMedian} relative to the active comparable asking-price median. This is a negotiation signal, not a formal valuation.`
                    : `EiX has verified the asking price and core property dimensions, but not enough comparable evidence to establish market position. The R3.55m asking price therefore remains the key question to resolve before committing capital.`}
                </p>
              </div>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">EiX Negotiation Intelligence</p>
              <h2 className="mt-1 text-2xl font-bold">What to resolve before making an offer</h2>
              <div className="mt-5 grid gap-3">
                {buyerQuestions.map((question, index) => (
                  <div key={question} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400/10 text-xs font-bold text-teal-300">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-sm font-semibold">{question}</p>
                      <p className="mt-1 text-xs leading-5 text-white/40">{index === 0 && comparableCount === 0 ? 'This is currently the highest-impact unresolved market question.' : 'Independent verification is recommended before relying on this item for a transaction decision.'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold">EiX negotiation readiness</p>
                <p className="mt-1 text-sm text-white/55">{comparableCount > 0 ? 'Market evidence is available. Use the comparable set and property-specific differences to frame the discussion.' : 'Low — comparable evidence is not yet sufficient to justify a specific discount or offer price. EiX will not invent a negotiation number without evidence.'}</p>
              </div>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">Acquisition Intelligence</p>
              <h2 className="mt-1 text-2xl font-bold">What the purchase could look like</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-4">
                {[
                  ['Asking price', currency(askingPriceCents)],
                  ['10% deposit', currency(askingPriceCents !== null ? Math.round(askingPriceCents * 0.10) : null)],
                  ['90% loan', currency(report.bond_loan_amount_cents)],
                  ['Illustrative monthly bond', currency(report.bond_monthly_payment_cents)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/35">{label}</p>
                    <p className="mt-2 text-xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">Illustrative scenario only. It does not constitute a lending quote. The report's assumptions and transaction-cost caveats are shown below.</p>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-400">EiX Bottom Line</p>
              <h2 className="mt-1 text-2xl font-bold">What should you take away?</h2>
              <div className="mt-5 rounded-2xl border border-teal-400/20 bg-teal-400/5 p-6">
                <p className="text-base leading-7 text-white/80">{decisionBody}</p>
                {comparableCount === 0 && (
                  <p className="mt-4 text-base font-semibold leading-7 text-white">
                    Do not let the absence of comparable evidence become a guess. Resolve the market-price question first.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <h2 className="text-lg font-bold">Why the score is {report.investment_score ?? '—'}/100</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">EiX separates property evidence from market evidence. When verified comparables are unavailable, the score is deliberately capped rather than presented as a market-backed valuation.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Evidence</p><p className="mt-1 text-xl font-semibold">{text(score.evidence, '0')}/100</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Property Fundamentals</p><p className="mt-1 text-xl font-semibold">{text(score.fundamentals, '0')}/100</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Financial Clarity</p><p className="mt-1 text-xl font-semibold">{text(score.financialClarity, '0')}/100</p></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Market Position</p><p className="mt-1 text-xl font-semibold">{comparableCount > 0 ? `${text(score.marketPosition, '0')}/100` : 'Unresolved'}</p></div>
              </div>
            </section>
          </>
        )}

        <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
          <h2 className="text-lg font-bold">Verified Evidence</h2>
          <p className="mt-2 text-sm text-white/55">This is the audit layer behind the EiX decision brief. It shows what the supplied source established and what remains unverified.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {verifiedFacts.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase text-white/35">{label}</p>
                <p className="mt-1 font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-white/35">Evidence records attached: {evidence.length}</p>
        </section>

        {internationalBuyer?.profile?.buyerType === 'international' && (
          <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
            <h2 className="text-lg font-bold">International Buyer Intelligence</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Evidence-led intelligence for international purchasers. This section does not constitute legal, tax, immigration or formal valuation advice.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Buyer Country</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerCountry)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Purpose</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerPurpose)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Budget</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerBudget)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Market Position</p><p className="mt-1 font-semibold">{text(internationalBuyer.marketPosition)}</p></div>
            </div>
            {Array.isArray(internationalBuyer.evidenceGaps) && internationalBuyer.evidenceGaps.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Evidence Gaps</h3><ul className="mt-3 space-y-2 text-sm text-white/55">{internationalBuyer.evidenceGaps.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></div>}
            {Array.isArray(internationalBuyer.dueDiligenceQuestions) && internationalBuyer.dueDiligenceQuestions.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">International Buyer Due Diligence</h3><ul className="mt-3 space-y-2 text-sm text-white/55">{internationalBuyer.dueDiligenceQuestions.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></div>}
          </section>
        )}

        {isPro ? (
          <>
            <section className="mt-6 glass rounded-2xl p-6">
              <h2 className="text-lg font-bold">Investor Analysis</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">This analysis evaluates verified listing evidence, acquisition assumptions, available market evidence and explicitly identified information gaps.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {['marketIntelligence', 'rentalDemand', 'growthOutlook', 'exitStrategy'].map((key) => (
                  <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">{key.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 font-semibold">{statusLabel(investor[key]?.status)}</p></div>
                ))}
              </div>
            </section>
            {proSections.map(([title, section]) => section && <section key={title} className="mt-6 glass rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{title}</h2><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">{statusLabel(section?.status)}</span></div>
              <p className="mt-3 text-sm leading-relaxed text-white/55">{text(section?.summary)}</p>
              {Array.isArray(section?.opportunities) && section.opportunities.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/70">{section.opportunities.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul>}
              {Array.isArray(section?.items) && section.items.length > 0 && <div className="mt-4 space-y-3">{section.items.map((item: any, index: number) => <div key={`${String(item?.risk)}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">{text(item?.risk)}</p><p className="mt-1 text-sm text-white/50">{text(item?.reason)}</p><p className="mt-2 text-xs uppercase tracking-wider text-white/30">Severity: {text(item?.severity)}</p></div>)}</div>}
            </section>)}
            {investor.acquisitionIntelligence && <section className="mt-6 glass rounded-2xl p-6"><h2 className="text-lg font-bold">Acquisition Intelligence</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase text-white/40">10% Deposit</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.depositCents)}</p></div><div><p className="text-xs uppercase text-white/40">Transfer Duty</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.transferDutyCents)}</p></div><div><p className="text-xs uppercase text-white/40">90% Loan</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.loanAmountCents)}</p></div><div><p className="text-xs uppercase text-white/40">Monthly Bond</p><p className="mt-1 text-xl font-semibold">{currency(investor.acquisitionIntelligence.bondMonthlyPaymentCents)}</p></div></div></section>}
          </>
        ) : (
          <>
            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <h2 className="text-lg font-bold">Rental & Financial Clarity</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div><p className="text-xs uppercase text-white/35">Gross Rental Yield</p><p className="mt-1 text-xl font-semibold">{report.rental_yield_percent === null ? 'Not available' : `${report.rental_yield_percent}%`}</p></div>
                <div><p className="text-xs uppercase text-white/35">BondMatch Monthly Payment</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_monthly_payment_cents)}</p></div>
                <div><p className="text-xs uppercase text-white/35">BondMatch Loan Amount</p><p className="mt-1 text-xl font-semibold">{currency(report.bond_loan_amount_cents)}</p></div>
                <div><p className="text-xs uppercase text-white/35">Risk</p><p className="mt-1 text-xl font-semibold">{report.risk_level || 'Unrated'}</p></div>
              </div>
              <p className="mt-4 text-xs leading-5 text-white/40">Rental yield and cash-flow are not calculated without verified rental income and relevant operating-cost evidence.</p>
            </section>

            <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
              <h2 className="text-lg font-bold">What EiX Could Not Verify</h2>
              <p className="mt-2 text-sm text-white/55">These are not generic disclaimers. They are the remaining evidence gaps that could change the transaction decision.</p>
              {limitations.length > 0 ? <ul className="mt-4 space-y-3 text-sm text-white/60">{limitations.map((item: unknown) => <li key={String(item)} className="rounded-xl border border-white/10 bg-white/5 p-4">• {String(item)}</li>)}</ul> : <p className="mt-4 text-sm text-white/55">No material evidence gaps were recorded.</p>}
              {assumptions.length > 0 && <><h3 className="mt-6 text-sm font-semibold">Scenario assumptions</h3><ul className="mt-3 space-y-2 text-sm text-white/55">{assumptions.map((item: unknown) => <li key={String(item)}>• {String(item)}</li>)}</ul></>}
            </section>
          </>
        )}

        <section className="mt-6 glass rounded-2xl p-6 sm:p-7">
          <h2 className="text-lg font-bold">EiX Method & Important Limitations</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">EiX Property Score™ provides property decision intelligence based on available evidence and stated assumptions. It is not a formal property valuation, financial advice, legal advice, tax advice or investment guarantee. Information should be independently verified before making a transaction decision.</p>
        </section>

        <p className="mt-8 pb-8 text-center text-xs text-white/25">EiX Property Score™ · Evidence-first property decision intelligence</p>
      </div>
    </main>
  );
}
