import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { ReportPrintButton } from '@/components/report-print-button';

function currency(cents: number | null | undefined): string {
  return typeof cents !== 'number' || !Number.isFinite(cents) ? 'Not verified' : `R ${(cents / 100).toLocaleString('en-ZA')}`;
}
function text(value: unknown, fallback = 'Not available'): string {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}
function yesNo(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not verified';
}
function percent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Not available';
}
function number(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-ZA') : 'Not verified';
}
function pricePerM2(priceCents: unknown, floorM2: unknown): string {
  if (typeof priceCents !== 'number' || typeof floorM2 !== 'number' || !Number.isFinite(priceCents) || !Number.isFinite(floorM2) || floorM2 <= 0) return 'Not available';
  return currency(Math.round(priceCents / floorM2));
}
function coverage(floorM2: unknown, landM2: unknown): string {
  if (typeof floorM2 !== 'number' || typeof landM2 !== 'number' || !Number.isFinite(floorM2) || !Number.isFinite(landM2) || landM2 <= 0) return 'Not available';
  return `${((floorM2 / landM2) * 100).toFixed(0)}%`;
}
function contains(textValue: unknown, terms: string[]): boolean {
  const value = typeof textValue === 'string' ? textValue.toLowerCase() : '';
  return terms.some((term) => value.includes(term));
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
    .select('id,status,report_type,investment_score,ai_confidence,property_facts,property_evidence,score_breakdown,assumptions,limitations,rental_yield_percent,bond_monthly_payment_cents,bond_loan_amount_cents,risk_level,recommendation,confidence_label,access_token,processed_at,investor_analysis,international_buyer_analysis')
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

  const askingPrice = typeof facts.askingPriceCents === 'number' ? facts.askingPriceCents : null;
  const floorM2 = typeof facts.floorSizeM2 === 'number' ? facts.floorSizeM2 : null;
  const landM2 = typeof facts.landSizeM2 === 'number' ? facts.landSizeM2 : null;
  const comparableCount = Number(score.marketComparableCount || 0);
  const psm2 = score.subjectPricePerM2Cents ? currency(score.subjectPricePerM2Cents) : pricePerM2(askingPrice, floorM2);
  const vsMedian = comparableCount > 0 ? percent(score.subjectVsMedianPercent) : 'Not established';
  const address = text(facts.address, 'Address not verified');
  const title = text(facts.title, 'Property Analysis');
  const description = text(facts.description, '');
  const renovated = contains(description, ['renovat', 'refurbished', 'modernised', 'modernized', 'newly updated']);
  const propertyType = text(facts.propertyType, 'Property');
  const price = currency(askingPrice);

  const scoreNumber = typeof report.investment_score === 'number' ? report.investment_score : null;
  const buyerSignal = comparableCount === 0
    ? scoreNumber !== null && scoreNumber >= 60
      ? 'PROCEED — WITH PRICE & MARKET CHECK'
      : scoreNumber !== null && scoreNumber >= 50
        ? 'INVESTIGATE — PRICE & MARKET EVIDENCE REQUIRED'
        : 'CAUTION — RESOLVE MATERIAL EVIDENCE GAPS'
    : report.recommendation === 'Buy' || report.recommendation === 'Strong Buy'
      ? 'PROCEED — REVIEW MARKET EVIDENCE'
      : report.recommendation === 'Consider'
        ? 'CONSIDER — REVIEW PRICE & EVIDENCE'
        : 'CAUTION — INVESTIGATE BEFORE COMMITTING';

  const decisionBody = comparableCount === 0
    ? `EiX has established the core physical and financial profile of this ${propertyType.toLowerCase()}, but it has not established enough verified comparable market evidence to say whether ${price} represents fair market value. The property may still be worth pursuing; the price question is simply the most important question left to answer.`
    : `EiX has established a verified comparable set and uses it as a market signal. Read that signal alongside the property's physical profile, financial scenario and due-diligence requirements.`;

  const assessmentHeadline = comparableCount === 0
    ? scoreNumber !== null && scoreNumber >= 60 ? 'Promising Property — Market Price Requires Verification' : 'Property Requires Further Investigation'
    : report.recommendation === 'Buy' || report.recommendation === 'Strong Buy' ? 'Positive Signal — Review the Evidence' : report.recommendation === 'Consider' ? 'Consider — Review Price & Evidence' : 'Caution — Investigate Before Committing';

  const evidenceMap: Array<{ finding: string; value: string; impact: string }> = [
    { finding: 'Asking price', value: price, impact: 'HIGH' },
    { finding: 'Floor size', value: floorM2 !== null ? `${number(floorM2)} m²` : 'Not established', impact: 'HIGH' },
    { finding: 'Erf size', value: landM2 !== null ? `${number(landM2)} m²` : 'Not established', impact: 'HIGH' },
    { finding: 'Parking', value: text(facts.parking, 'Not established'), impact: 'MEDIUM' },
    { finding: 'Rates & taxes', value: currency(typeof facts.ratesAndTaxesCents === 'number' ? facts.ratesAndTaxesCents : null), impact: 'MEDIUM' },
    { finding: 'Garden', value: yesNo(facts.hasGarden), impact: 'MEDIUM' },
    { finding: 'Fibre', value: yesNo(facts.hasFibre), impact: 'LOW / MEDIUM' },
    { finding: 'Renovation / condition', value: renovated ? 'Listing-supported' : 'Not established', impact: renovated ? 'HIGH' : 'MEDIUM' },
    { finding: 'Levies', value: currency(typeof facts.leviesCents === 'number' ? facts.leviesCents : null), impact: 'MEDIUM' },
    { finding: 'Rental income', value: report.rental_yield_percent === null ? 'Not established' : 'Available', impact: 'HIGH' },
    { finding: 'Comparable prices', value: comparableCount > 0 ? `${comparableCount} verified` : 'Not sufficiently verified', impact: 'VERY HIGH' },
  ];

  const whySignals: Array<{ title: string; body: string }> = [];
  if (renovated) whySignals.push({ title: 'Renovated condition', body: 'The supplied listing description supports a renovated or recently updated condition. EiX treats this as a listing-supported characteristic, not an independent inspection.' });
  if (landM2 !== null) whySignals.push({ title: `${number(landM2)} m² erf`, body: 'The property has meaningful private land relative to its recorded floor area, which can affect owner-occupier appeal and the way buyers compare the property with alternatives.' });
  if (floorM2 !== null) whySignals.push({ title: `${number(floorM2)} m² internal floor area`, body: `${psm2} asking price per m² gives buyers a useful comparison metric once similar properties are assessed.` });
  if (facts.parking !== null && facts.parking !== undefined) whySignals.push({ title: `${facts.parking} parking spaces`, body: 'Parking is explicitly supported by the supplied evidence and can materially affect practical usability and buyer appeal.' });
  if (facts.hasGarden) whySignals.push({ title: 'Private garden', body: 'A garden is recorded in the supplied evidence and is a meaningful owner-occupier feature.' });
  if (facts.hasFibre) whySignals.push({ title: 'Fibre connectivity', body: 'Fibre is recorded in the supplied evidence and adds practical connectivity value.' });
  if (facts.ratesAndTaxesCents !== null && facts.ratesAndTaxesCents !== undefined) whySignals.push({ title: `${currency(facts.ratesAndTaxesCents)} rates & taxes`, body: 'A stated recurring property cost is available for the acquisition scenario.' });

  const buyerQuestions = [
    `Is ${price} supported by comparable properties with reliable price and size evidence?`,
    'What are comparable properties in the same area actually achieving, and how long are they taking to sell?',
    report.rental_yield_percent === null ? 'What rental income could this property realistically generate, and what would the net position be after operating costs?' : 'Does the rental yield remain attractive after realistic operating costs?',
    'Are there additional ownership costs, restrictions or obligations not visible in the supplied listing?',
    renovated ? 'Does the renovation quality justify any premium over comparable properties?' : `Does the property's condition justify the asking price relative to comparable properties?`,
  ];

  const verifiedFacts: Array<[string, string]> = [
    ['Asking Price', price],
    ['Property Type', propertyType],
    ['Bedrooms', text(facts.bedrooms)],
    ['Bathrooms', text(facts.bathrooms)],
    ['Floor Size', floorM2 !== null ? `${number(floorM2)} m²` : 'Not verified'],
    ['Land Size', landM2 !== null ? `${number(landM2)} m²` : 'Not verified'],
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
    <main className="min-h-screen bg-midnight px-4 py-6 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <img src="/eixproplogo.png" alt="EiX Property Score" className="h-11 w-auto" />
          <ReportPrintButton />
        </div>

        <section className="glass-strong rounded-3xl p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-400">EiX Property Score™</p>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-2 text-white/60">{address}</p>
              <p className="mt-4 text-2xl font-semibold">{price} <span className="text-sm font-normal text-white/40">asking</span></p>
            </div>
            {!isPro && (
              <div className="rounded-3xl border border-teal-400/20 bg-teal-400/5 px-6 py-5 lg:min-w-[230px] lg:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">EiX Property Score</p>
                <p className="mt-1 text-5xl font-bold text-teal-400">{scoreNumber ?? '—'}<span className="text-lg text-white/35">/100</span></p>
                <p className="mt-1 text-xs text-white/45">Confidence {report.ai_confidence ?? 0}% · {report.confidence_label || 'Unknown'}</p>
              </div>
            )}
          </div>

          {!isPro && (
            <div className="mt-7 rounded-3xl border border-amber-300/20 bg-amber-300/5 p-6 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/75">EiX Buyer Signal</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{buyerSignal}</h2>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-white/75">{decisionBody}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{report.risk_level || 'Unrated'} risk</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{report.confidence_label || 'Unknown'} confidence</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{comparableCount} verified comparables</span>
              </div>
            </div>
          )}
        </section>

        {!isPro && (
          <>
            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Why this property caught EiX's attention</p>
              <h2 className="mt-1 text-2xl font-bold">What the listing tells you — and what it means</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {whySignals.slice(0, 7).map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-base font-semibold"><span className="mr-2 text-teal-400">✓</span>{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{item.body}</p>
                  </div>
                ))}
              </div>
              {whySignals.length === 0 && <p className="mt-5 text-sm text-white/55">EiX has not established enough additional source detail to create a property-specific highlight set.</p>}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <div className="glass rounded-3xl p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">The biggest question</p>
                <h2 className="mt-2 text-3xl font-bold">Is {price} justified?</h2>
                <p className="mt-4 text-sm leading-7 text-white/65">{comparableCount > 0 ? `EiX can compare this property with ${comparableCount} verified comparable properties. The resulting market signal is shown below and should be treated as negotiation evidence, not a formal valuation.` : `EiX could verify the asking price and core property specifications, but it has not established enough verified comparable market evidence to tell you whether ${price} is fair market value.`}</p>
                <p className="mt-4 text-sm font-semibold leading-7 text-white">{comparableCount > 0 ? 'Use the comparable evidence to investigate price position before committing.' : 'That is not a reason to discard the property. It is the number-one question to investigate before making an offer.'}</p>
              </div>
              <div className="glass rounded-3xl p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">EiX Assessment</p>
                <h2 className="mt-2 text-2xl font-bold">{assessmentHeadline}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">EiX has enough evidence to analyse several material characteristics. The remaining uncertainty is concentrated around the evidence that could change the transaction decision.</p>
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">EiX Evidence Map</p>
                  <h2 className="mt-1 text-2xl font-bold">What matters to the decision</h2>
                </div>
                <p className="text-xs text-white/40">Impact reflects potential decision significance, not data quality.</p>
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[1.1fr_1fr_.65fr] bg-white/5 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                  <span>Finding</span><span>Value</span><span>Decision impact</span>
                </div>
                {evidenceMap.map((item) => (
                  <div key={item.finding} className="grid grid-cols-[1.1fr_1fr_.65fr] border-t border-white/10 px-4 py-4 text-sm">
                    <span className="font-medium">{item.finding}</span><span className="text-white/60">{item.value}</span><span className={item.impact === 'VERY HIGH' ? 'font-semibold text-amber-200' : 'text-white/45'}>{item.impact}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">EiX Property Anatomy™</p>
              <h2 className="mt-1 text-2xl font-bold">The property beyond the listing headline</h2>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Land', landM2 !== null ? `${number(landM2)} m²` : 'Not verified'],
                  ['Building', floorM2 !== null ? `${number(floorM2)} m²` : 'Not verified'],
                  ['Bedrooms', text(facts.bedrooms)],
                  ['Bathrooms', text(facts.bathrooms)],
                  ['Parking', text(facts.parking)],
                  ['Garden', yesNo(facts.hasGarden)],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] uppercase tracking-[0.15em] text-white/35">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-[0.15em] text-white/35">Asking price / floor m²</p><p className="mt-2 text-2xl font-bold">{psm2}</p><p className="mt-2 text-sm leading-6 text-white/50">A comparison metric derived from the verified asking price and floor area. It is not a valuation.</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-[0.15em] text-white/35">Building / erf relationship</p><p className="mt-2 text-2xl font-bold">{coverage(floorM2, landM2)}</p><p className="mt-2 text-sm leading-6 text-white/50">The recorded floor area as a proportion of the recorded erf size. EiX uses this to help contextualise the physical proposition.</p></div>
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Why EiX scored this property {scoreNumber ?? '—'}/100</p>
              <h2 className="mt-1 text-2xl font-bold">The score explained</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {[
                  ['Property Evidence — Strong', `Core listing information is available across ${evidence.length} evidence records, including material property facts that EiX can verify.`],
                  ['Property Fundamentals — Positive with limitations', `The physical profile contributes to the score through bedrooms, bathrooms, size, land, parking, garden and other verified characteristics. Missing characteristics are not assumed to be present.`],
                  ['Financial Clarity — Moderate', `The asking price and acquisition scenario can be calculated, while rental economics and unverified operating costs remain unresolved.`],
                  ['Market Position — Unresolved', comparableCount > 0 ? `EiX has ${comparableCount} verified comparables and reports the resulting market signal below.` : 'Comparable evidence is currently insufficient to establish whether the asking price is above, below or within the expected market range.'],
                ].map(([heading, body]) => <div key={heading} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="font-semibold">{heading}</p><p className="mt-2 text-sm leading-6 text-white/55">{body}</p></div>)}
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Price Intelligence</p>
              <h2 className="mt-1 text-2xl font-bold">Does the market support the asking price?</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase text-white/35">Asking price</p><p className="mt-2 text-2xl font-bold">{price}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase text-white/35">Price / m²</p><p className="mt-2 text-2xl font-bold">{psm2}</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase text-white/35">Subject vs median</p><p className="mt-2 text-2xl font-bold">{vsMedian}</p></div>
              </div>
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="font-semibold">{comparableCount > 0 ? 'Market signal' : 'Market position unresolved'}</p><p className="mt-2 text-sm leading-6 text-white/65">{comparableCount > 0 ? `The subject is ${vsMedian} relative to the active comparable asking-price median. This is market evidence, not a formal valuation.` : 'EiX will not manufacture a market conclusion where the comparable evidence is insufficient. Obtain verified comparable prices, sizes and property-type matches before treating the asking price as fair or unfair.'}</p></div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Before You Make an Offer</p>
              <h2 className="mt-1 text-2xl font-bold">Five questions EiX says you should answer</h2>
              <div className="mt-6 space-y-3">
                {buyerQuestions.map((question, index) => <div key={question} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-400/10 text-xs font-bold text-teal-300">{String(index + 1).padStart(2, '0')}</span><p className="pt-1 text-sm leading-6">{question}</p></div>)}
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">EiX Negotiation Intelligence</p>
              <h2 className="mt-1 text-2xl font-bold">What you need before negotiating price</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Current asking price', price],
                  ['Market position', comparableCount > 0 ? `${vsMedian} vs comparable median` : 'Not yet established'],
                  ['Negotiation readiness', comparableCount > 0 ? 'Evidence available' : 'LOW — evidence required'],
                  ['Comparable properties', comparableCount > 0 ? `${comparableCount} verified` : 'Required'],
                  ['Recent achieved prices', 'Required'],
                  ['Time on market', 'Verify'],
                  ['Condition differences', renovated ? 'Renovation is listing-supported; compare quality' : 'Verify against comparables'],
                  ['Seller motivation', 'Verify'],
                  ['Rental potential', report.rental_yield_percent === null ? 'Verify rent' : `${report.rental_yield_percent}% yield`],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-[0.14em] text-white/35">{label}</p><p className="mt-2 font-semibold">{value}</p></div>)}
              </div>
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm font-semibold leading-6">EiX cannot responsibly recommend a discount percentage without verified comparable evidence.</p>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Acquisition Scenario</p>
              <h2 className="mt-1 text-2xl font-bold">What the purchase could look like</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Purchase price', price],
                  ['10% deposit', askingPrice !== null ? currency(Math.round(askingPrice * 0.10)) : 'Not available'],
                  ['Estimated loan', currency(report.bond_loan_amount_cents)],
                  ['Illustrative monthly bond', currency(report.bond_monthly_payment_cents)],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-[0.14em] text-white/35">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-[0.14em] text-white/35">Cash requirement</p><p className="mt-2 text-sm leading-6 text-white/65">Deposit plus applicable transfer/acquisition costs and legal/conveyancing costs where relevant.</p></div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5"><p className="text-xs uppercase tracking-[0.14em] text-amber-200/60">Important</p><p className="mt-2 text-sm leading-6 text-white/65">This is an illustrative financing scenario, not a lending quote.</p></div>
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">EiX Property DNA™</p>
              <h2 className="mt-1 text-2xl font-bold">How this property presents itself</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['OWNER-OCCUPIER', facts.hasGarden || facts.parking ? 'Relevant practical features are established.' : 'Requires further property-specific evidence.'],
                  ['INVESTMENT', report.rental_yield_percent === null ? 'Requires verified rental evidence.' : `${report.rental_yield_percent}% gross rental yield is available.`],
                  ['RENOVATED', renovated ? 'Listing-supported.' : 'Not independently established.'],
                  ['OUTDOOR SPACE', facts.hasGarden ? 'Private garden recorded.' : 'Not established.'],
                  ['PARKING', facts.parking !== null && facts.parking !== undefined ? `${facts.parking} spaces recorded.` : 'Not established.'],
                  ['CONNECTIVITY', facts.hasFibre ? 'Fibre recorded.' : 'Not established.'],
                  ['MARKET CERTAINTY', comparableCount > 0 ? 'Comparable evidence available.' : 'Needs comparable evidence.'],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-[10px] font-bold tracking-[0.16em] text-teal-300">{label}</p><p className="mt-2 text-sm leading-6 text-white/55">{value}</p></div>)}
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Risk & Red Flags</p>
              <h2 className="mt-1 text-2xl font-bold">What could change the decision?</h2>
              <div className="mt-5 space-y-3">
                {[
                  comparableCount === 0 ? 'Market price is unresolved because verified comparable evidence is insufficient.' : null,
                  report.rental_yield_percent === null ? 'Rental economics are unresolved because verified rental income is unavailable.' : null,
                  facts.ratesAndTaxesCents === null || facts.ratesAndTaxesCents === undefined ? 'Rates and taxes were not established from the supplied evidence.' : null,
                  facts.leviesCents === null || facts.leviesCents === undefined ? 'Levies or other recurring ownership costs were not established.' : null,
                  ...limitations.slice(0, 3),
                ].filter(Boolean).filter((item, index, values) => values.indexOf(item) === index).map((item) => <div key={String(item)} className="rounded-2xl border border-amber-300/15 bg-amber-300/5 p-5 text-sm leading-6 text-white/65">• {String(item)}</div>)}
              </div>
            </section>

            <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Due-Diligence Priorities</p>
              <h2 className="mt-1 text-2xl font-bold">Exactly what should be verified</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {limitations.length > 0 ? limitations.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white/60">• {item}</div>) : <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">No material evidence gaps were recorded.</div>}
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-teal-400/20 bg-teal-400/5 p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">EiX Bottom Line</p>
              <h2 className="mt-1 text-2xl font-bold">What should you remember?</h2>
              <p className="mt-5 text-base leading-8 text-white/80"><strong>This is an interesting property, but the {price} asking price is the critical unresolved issue.</strong></p>
              <p className="mt-3 text-base leading-8 text-white/70">The physical proposition is reasonably well defined: a {propertyType.toLowerCase()} with {text(facts.bedrooms)} bedrooms, {text(facts.bathrooms)} bathrooms{landM2 !== null ? `, a ${number(landM2)} m² erf` : ''}{floorM2 !== null ? ` and ${number(floorM2)} m² floor area` : ''}{facts.parking !== null && facts.parking !== undefined ? `, ${facts.parking} parking spaces` : ''}{facts.hasGarden ? ', garden' : ''}{facts.hasFibre ? ' and fibre' : ''}.</p>
              <p className="mt-3 text-base leading-8 text-white/70">The next decision should therefore not be “Do I like the property?” It should be: <strong>“Does the market support {price} for this particular property?”</strong></p>
              <p className="mt-3 text-base font-semibold leading-8 text-white">{comparableCount === 0 ? 'EiX recommends resolving that question before committing to an offer.' : 'EiX recommends reviewing the comparable evidence and property-specific differences before committing to an offer.'}</p>
            </section>
          </>
        )}

        <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">Evidence & Sources</p>
          <h2 className="mt-1 text-2xl font-bold">Verified property facts</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {verifiedFacts.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase tracking-[0.14em] text-white/35">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
          </div>
          <p className="mt-5 text-xs text-white/35">Evidence records attached: {evidence.length}</p>
        </section>

        {internationalBuyer?.profile?.buyerType === 'international' && (
          <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold">International Buyer Intelligence</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Evidence-led intelligence for international purchasers. This does not constitute legal, tax, immigration or formal valuation advice.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Buyer Country</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerCountry)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Purpose</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerPurpose)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Budget</p><p className="mt-1 font-semibold">{text(internationalBuyer.profile?.buyerBudget)}</p></div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs uppercase text-white/35">Market Position</p><p className="mt-1 font-semibold">{text(internationalBuyer.marketPosition)}</p></div>
            </div>
          </section>
        )}

        {isPro && (
          <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
            <h2 className="text-lg font-bold">Investor Analysis</h2>
            <p className="mt-2 text-sm text-white/55">The investor report retains its evidence-backed analysis and acquisition sections.</p>
            {proSections.map(([sectionTitle, section]) => section && <div key={sectionTitle} className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex justify-between gap-4"><h3 className="font-semibold">{sectionTitle}</h3><span className="text-xs text-white/40">{text(section?.status, 'INSUFFICIENT_DATA')}</span></div><p className="mt-2 text-sm leading-6 text-white/55">{text(section?.summary)}</p></div>)}
          </section>
        )}

        <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-bold">Method & Important Limitations</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">EiX Property Score™ provides property decision intelligence based on available evidence and stated assumptions. It is not a formal property valuation, financial advice, legal advice, tax advice or investment guarantee. Information should be independently verified before making a transaction decision.</p>
          {assumptions.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Scenario assumptions</h3><ul className="mt-3 space-y-2 text-sm text-white/50">{assumptions.map((item) => <li key={item}>• {item}</li>)}</ul></div>}
        </section>

        <p className="mt-8 pb-8 text-center text-xs text-white/25">EiX Property Score™ · Property data → interpretation → decision intelligence → action</p>
      </div>
    </main>
  );
}
