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
function number(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-ZA') : 'Not verified';
}
function pricePerM2(priceCents: unknown, floorM2: unknown): string {
  if (typeof priceCents !== 'number' || typeof floorM2 !== 'number' || !Number.isFinite(priceCents) || !Number.isFinite(floorM2) || floorM2 <= 0) return 'Not established';
  return currency(Math.round(priceCents / floorM2));
}
function percent(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Not established';
}
function contains(value: unknown, terms: string[]): boolean {
  const haystack = typeof value === 'string' ? value.toLowerCase() : '';
  return terms.some((term) => haystack.includes(term));
}

function SignalCard({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail?: string; tone?: 'positive' | 'attention' | 'neutral' }) {
  const toneClass = tone === 'positive'
    ? 'border-teal-300/20 bg-teal-300/[0.06]'
    : tone === 'attention'
      ? 'border-amber-300/20 bg-amber-300/[0.06]'
      : 'border-white/10 bg-white/[0.035]';
  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-bold tracking-tight">{value}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-white/65">{detail}</p>}
    </div>
  );
}

function Section({ eyebrow, title, children, className = '' }: { eyebrow: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-6 shadow-2xl shadow-black/10 sm:p-8 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-200">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
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
  const scoreNumber = typeof report.investment_score === 'number' ? report.investment_score : null;
  const comparableCount = Number(score.marketComparableCount || 0);
  const psm2 = score.subjectPricePerM2Cents ? currency(score.subjectPricePerM2Cents) : pricePerM2(askingPrice, floorM2);
  const comparableMedian = score.marketMedianAskingPriceCents ? currency(score.marketMedianAskingPriceCents) : 'Not established';
  const vsMedian = comparableCount > 0 ? percent(score.subjectVsMedianPercent) : 'Not established';
  const address = text(facts.address, 'Address not verified');
  const title = text(facts.title, 'Property Analysis');
  const propertyType = text(facts.propertyType, 'Property');
  const price = currency(askingPrice);
  const description = text(facts.description, '');
  const primaryImageUrl = typeof facts.primaryImageUrl === 'string' && /^https:\/\//i.test(facts.primaryImageUrl) ? facts.primaryImageUrl : null;
  const renovated = contains(description, ['renovat', 'refurbished', 'modernised', 'modernized', 'newly updated']);
  const floorErfRatio = floorM2 !== null && landM2 !== null && landM2 > 0 ? `${((floorM2 / landM2) * 100).toFixed(0)}%` : 'Not established';

  const buyerSignal = comparableCount === 0
    ? scoreNumber !== null && scoreNumber >= 60
      ? 'PROCEED — WITH PRICE & MARKET CHECK'
      : scoreNumber !== null && scoreNumber >= 50
        ? 'INVESTIGATE — PRICE EVIDENCE REQUIRED'
        : 'CAUTION — RESOLVE MATERIAL GAPS'
    : report.recommendation === 'Buy' || report.recommendation === 'Strong Buy'
      ? 'PROCEED — REVIEW MARKET EVIDENCE'
      : report.recommendation === 'Consider'
        ? 'CONSIDER — REVIEW PRICE & EVIDENCE'
        : 'CAUTION — INVESTIGATE BEFORE COMMITTING';

  const decisionBody = comparableCount === 0
    ? `EiX has established the core physical proposition of this ${propertyType.toLowerCase()}. The unresolved variable is market price: EiX does not yet have enough verified comparable evidence to establish whether ${price} is fair. That becomes the first question to solve before an offer.`
    : `EiX has a verified comparable set. The market signal should be read alongside this property's size, condition, land, parking, financial scenario and evidence gaps — not as a formal valuation.`;

  const assessmentHeadline = comparableCount === 0
    ? scoreNumber !== null && scoreNumber >= 60 ? 'Promising Property — Market Price Requires Verification' : 'Property Requires Further Investigation'
    : report.recommendation === 'Buy' || report.recommendation === 'Strong Buy' ? 'Positive Signal — Review the Evidence' : report.recommendation === 'Consider' ? 'Consider — Review Price & Evidence' : 'Caution — Investigate Before Committing';

  const insight = floorM2 !== null && landM2 !== null
    ? `At ${price}, you are not simply buying ${text(facts.bedrooms)} bedrooms. You are paying for the combination of ${number(landM2)} m² of erf, ${number(floorM2)} m² of internal space, ${facts.parking ?? 'unverified'} parking, ${facts.hasGarden ? 'private outdoor space' : 'an unverified garden'} and the stated condition. The question is whether buyers in this market are paying enough of a premium for those characteristics to justify the asking price.`
    : `The listing establishes a useful property profile, but the price proposition cannot yet be separated from the missing market evidence. EiX therefore focuses the decision on the evidence most likely to change what you should do next.`;

  const evidenceMap = [
    ['Asking price', price, 'VERY HIGH'],
    ['Floor size', floorM2 !== null ? `${number(floorM2)} m²` : 'Not established', 'HIGH'],
    ['Erf size', landM2 !== null ? `${number(landM2)} m²` : 'Not established', 'HIGH'],
    ['Parking', text(facts.parking, 'Not established'), 'MEDIUM'],
    ['Rates & taxes', currency(typeof facts.ratesAndTaxesCents === 'number' ? facts.ratesAndTaxesCents : null), 'MEDIUM'],
    ['Garden', yesNo(facts.hasGarden), 'MEDIUM'],
    ['Fibre', yesNo(facts.hasFibre), 'LOW / MEDIUM'],
    ['Renovation / condition', renovated ? 'Listing-supported' : 'Not established', 'HIGH'],
    ['Rental income', report.rental_yield_percent === null ? 'Not established' : `${report.rental_yield_percent}% gross yield`, 'HIGH'],
    ['Comparable prices', comparableCount > 0 ? `${comparableCount} verified` : 'Not sufficiently verified', 'VERY HIGH'],
  ];

  const buyerQuestions = [
    `Is ${price} supported by recent comparable properties with reliable price, size and property-type evidence?`,
    'What are comparable properties actually achieving, and how long are they taking to sell?',
    report.rental_yield_percent === null ? 'What rent could this property realistically achieve, and what remains after operating costs?' : 'Does the rental yield remain attractive after realistic operating costs?',
    'Are there ownership costs, restrictions, defects or obligations that are not visible in the supplied listing?',
    renovated ? 'Does the renovation quality justify any premium over comparable properties?' : 'Does the condition justify the asking price relative to comparable properties?',
  ];

  const negotiationItems = [
    ['Current asking price', price],
    ['Market position', comparableCount > 0 ? `${vsMedian} vs comparable median` : 'Not established'],
    ['Negotiation readiness', comparableCount > 0 ? 'Evidence available' : 'LOW — build evidence first'],
    ['Comparable evidence', comparableCount > 0 ? `${comparableCount} verified` : 'Required'],
    ['Achieved prices', 'Verify recent sales'],
    ['Time on market', 'Verify'],
    ['Condition premium', renovated ? 'Compare renovation quality' : 'Verify condition'],
    ['Seller motivation', 'Verify'],
    ['Rental potential', report.rental_yield_percent === null ? 'Verify achievable rent' : `${report.rental_yield_percent}% gross yield`],
  ];

  const risks = [
    comparableCount === 0 ? 'Market price is unresolved: verified comparable evidence is insufficient to call the asking price fair or unfair.' : null,
    report.rental_yield_percent === null ? 'Rental economics are unresolved because verified rental evidence is unavailable.' : null,
    facts.leviesCents === null || facts.leviesCents === undefined ? 'Levies or other recurring ownership costs were not established.' : null,
    facts.ratesAndTaxesCents === null || facts.ratesAndTaxesCents === undefined ? 'Rates and taxes were not established from the supplied evidence.' : null,
    renovated ? 'Renovation is listing-supported, not independently inspected; quality and workmanship should be verified.' : null,
  ].filter(Boolean) as string[];

  const verifiedFacts: Array<[string, string]> = [
    ['Asking Price', price],
    ['Property Type', propertyType],
    ['Bedrooms', text(facts.bedrooms)],
    ['Bathrooms', text(facts.bathrooms)],
    ['Floor Size', floorM2 !== null ? `${number(floorM2)} m²` : 'Not verified'],
    ['Land Size', landM2 !== null ? `${number(landM2)} m²` : 'Not verified'],
    ['Parking', text(facts.parking)],
    ['Garden', yesNo(facts.hasGarden)],
    ['Fibre', yesNo(facts.hasFibre)],
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
    <main className="min-h-screen bg-midnight px-4 py-6 text-white sm:px-8 sm:py-10 print:bg-white print:text-black">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex justify-end print:hidden"><ReportPrintButton /></div>
        {!isPro && (
          <>
            <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20">
              {primaryImageUrl && <div className="h-64 overflow-hidden sm:h-[360px]"><img src={primaryImageUrl} alt="Property listing" className="h-full w-full object-cover" loading="eager" referrerPolicy="no-referrer" /></div>}
              <div className="p-6 sm:p-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-200">EiX Property Score™</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{title}</h1>
                <p className="mt-2 text-sm text-white/65">{address}</p>
                <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
                  <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Asking price</p><p className="mt-1 text-3xl font-black">{price}</p></div>
                  <div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Price / m²</p><p className="mt-1 text-2xl font-bold">{psm2}</p></div>
                </div>
              </div>
            </section>
            <section className="mt-5 rounded-[28px] border border-amber-200/15 bg-amber-200/[0.045] p-6 sm:p-8">
              <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/75">EiX Buyer Signal</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{buyerSignal}</h2>
                  <p className="mt-4 text-sm leading-7 text-white/70">{decisionBody}</p>
                </div>
                <div className="shrink-0 text-center">
                  <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border-8 border-teal-300/20 bg-teal-300/[0.06]"><div><p className="text-4xl font-black text-teal-300">{scoreNumber ?? '—'}</p><p className="text-[8px] uppercase tracking-[0.16em] text-white/55">Score</p></div></div>
                  <p className="mt-2 text-[11px] text-white/55">Confidence {report.ai_confidence ?? 0}% · {report.confidence_label || 'Unknown'}</p>
                </div>
              </div>
            </section>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Floor', floorM2 !== null ? number(floorM2) + ' m²' : 'Not verified'],
                ['Erf', landM2 !== null ? number(landM2) + ' m²' : 'Not verified'],
                ['Bedrooms', text(facts.bedrooms)], ['Bathrooms', text(facts.bathrooms)],
                ['Parking', text(facts.parking)],
                ['Rates & taxes', currency(typeof facts.ratesAndTaxesCents === 'number' ? facts.ratesAndTaxesCents : null)],
                ['Garden', yesNo(facts.hasGarden)], ['Fibre', yesNo(facts.hasFibre)]
              ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/50">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}
            </section>
            <Section eyebrow="The Biggest Question" title={"Is " + price + " justified by the market?"}>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">Core property facts are established, but the asking price cannot be called fair or stretched without sufficiently verified comparable sales.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SignalCard label="Asking" value={price} />
                <SignalCard label="Asking / floor m²" value={psm2} detail="Derived from asking price and floor area; not a valuation." />
                <SignalCard label="Comparable evidence" value={comparableCount > 0 ? String(comparableCount) + ' verified' : 'Not established'} tone={comparableCount > 0 ? 'positive' : 'attention'} />
              </div>
            </Section>
            <Section eyebrow="Why EiX Flagged It" title="The useful signals">
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SignalCard label="Renovation" value={renovated ? 'Listing-supported' : 'Not established'} />
                <SignalCard label="Outdoor space" value={facts.hasGarden ? 'Garden recorded' : 'Not established'} />
                <SignalCard label="Connectivity" value={facts.hasFibre ? 'Fibre recorded' : 'Not established'} />
                <SignalCard label="Parking" value={facts.parking !== null && facts.parking !== undefined ? String(facts.parking) + ' spaces' : 'Not established'} />
                <SignalCard label="Floor / erf" value={floorM2 !== null && landM2 !== null ? number(floorM2) + ' / ' + number(landM2) + ' m²' : 'Not established'} />
                <SignalCard label="Rental signal" value={report.rental_yield_percent === null ? 'Not established' : String(report.rental_yield_percent) + '% gross yield'} />
              </div>
            </Section>
            <Section eyebrow="EiX Assessment" title={assessmentHeadline}><p className="mt-4 max-w-4xl text-sm leading-7 text-white/70">{insight}</p></Section>
            <Section eyebrow="Before You Make an Offer" title="Five things to verify">
              <div className="mt-5 space-y-2">{buyerQuestions.map((question, index) => <div key={question} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal-300/10 text-[10px] font-bold text-teal-200">{String(index + 1).padStart(2, '0')}</span><p className="text-sm leading-6 text-white/65">{question}</p></div>)}</div>
            </Section>
            <Section eyebrow="Risk & Red Flags" title="What could change the decision?">
              <div className="mt-5 space-y-2">{risks.length > 0 ? risks.map((risk) => <div key={risk} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 text-sm leading-6 text-white/65"><span className="mr-2 text-amber-200">!</span>{risk}</div>) : <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.035] p-4 text-sm text-white/65">No material red flags generated from the available evidence.</div>}</div>
            </Section>
            <section className="mt-5 rounded-[28px] border border-teal-300/20 bg-teal-300/[0.06] p-6 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-200">EiX Bottom Line</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">The property is interesting. The price is the test.</h2>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-white/70">{"The physical proposition is reasonably well defined: " + text(facts.bedrooms) + " bedrooms, " + text(facts.bathrooms) + " bathrooms" + (floorM2 !== null ? ", approximately " + number(floorM2) + " m² floor area" : "") + (landM2 !== null ? ", " + number(landM2) + " m² erf" : "") + (facts.parking !== null && facts.parking !== undefined ? " and " + facts.parking + " parking bays" : "") + "."}</p>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-7 text-white">{comparableCount === 0 ? 'Resolve the market-price question before committing to an offer.' : 'Review the comparable evidence and property-specific differences before committing to an offer.'}</p>
            </section>
          </>
        )}
        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <details>
            <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-[0.22em] text-teal-200">Evidence & Sources · Open audit trail</summary>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {verifiedFacts.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[9px] uppercase tracking-[0.14em] text-white/50">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}
            </div>
            <p className="mt-4 text-xs text-white/45">Evidence records attached: {evidence.length}. Detailed source material is intentionally kept out of the decision layer.</p>
          </details>
        </section>
        {isPro && <section className="mt-5 rounded-[28px] border border-teal-300/15 bg-white/[0.02] p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-200">Investor Report</p><h2 className="mt-2 text-2xl font-black">Deeper investment intelligence</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{proSections.map(([sectionTitle, section]) => section && <div key={sectionTitle} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex justify-between gap-3"><h3 className="font-semibold">{sectionTitle}</h3><span className="text-[9px] uppercase tracking-[0.12em] text-white/50">{text(section?.status, 'INSUFFICIENT_DATA')}</span></div><p className="mt-2 text-sm leading-6 text-white/65">{text(section?.summary)}</p></div>)}</div></section>}
        <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">Method & limitations</p><p className="mt-3 text-xs leading-6 text-white/50">EiX Property Score™ provides property decision intelligence from available evidence and stated assumptions. It is not a formal valuation, financial, legal or tax advice. Information should be independently verified before a transaction decision.</p></section>
        <p className="mt-6 pb-6 text-center text-[9px] uppercase tracking-[0.18em] text-white/20">EiX Property Score™ · Listing data → interpretation → decision intelligence</p>
      </div>
    </main>
  );
}
