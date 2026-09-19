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
    <section className={`mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-6 shadow-xl shadow-black/10 sm:p-8 ${className}`}>
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
  const landM2 = typeof facts.landSizeM2 === 'number' ? facts.landSizeM2 : null;
  const scoreNumber = typeof report.investment_score === 'number' ? report.investment_score : null;
  const comparableCount = Number(score.marketComparableCount || 0);
  const comparableMedian = score.marketMedianAskingPriceCents ? currency(score.marketMedianAskingPriceCents) : 'Not established';
  const vsMedian = comparableCount > 0 ? percent(score.subjectVsMedianPercent) : 'Not established';
  const address = text(facts.address, 'Address not verified');
  const title = text(facts.title, 'Property Analysis');
  const propertyType = text(facts.propertyType, 'Property');
  const price = currency(askingPrice);
  const rawDescription = typeof facts.description === 'string' ? facts.description : '';
  const descriptionMarkers = ['Charming ', 'SOLE MANDATE', 'Observatory has quickly become'];
  const markerPositions = descriptionMarkers.map((marker) => rawDescription.toLowerCase().indexOf(marker.toLowerCase())).filter((position) => position >= 0);
  const descriptionStart = markerPositions.length ? Math.min(...markerPositions) : 0;
  let description = rawDescription.slice(descriptionStart);
  const descriptionEnd = description.indexOf('Viewings by appointment only!');
  if (descriptionEnd >= 0) description = description.slice(0, descriptionEnd + 'Viewings by appointment only!'.length);
  description = description
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&rsquo;/gi, '’')
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&#39;/gi, "'")
    .trim();
  const bathroomMarker = description.toLowerCase().indexOf('bathrooms:');
  const bathroomTail = bathroomMarker >= 0 ? description.slice(bathroomMarker + 'bathrooms:'.length).trim() : '';
  const bathroomToken = bathroomTail.split(/\\s+/)[0].replace(/[^0-9.]/g, '');
  const bathrooms = bathroomToken ? Number(bathroomToken) : facts.bathrooms;
  const floorMarker = description.toLowerCase().indexOf('floor m2:');
  const floorTail = floorMarker >= 0 ? description.slice(floorMarker + 'floor m2:'.length).trim() : '';
  const floorToken = floorTail.split(/\\s+/)[0].replace(/[^0-9.]/g, '');
  const floorM2 = typeof facts.floorSizeM2 === 'number' && Number.isFinite(facts.floorSizeM2) ? facts.floorSizeM2 : floorToken ? Number(floorToken) : null;
  const psm2 = score.subjectPricePerM2Cents ? currency(score.subjectPricePerM2Cents) : pricePerM2(askingPrice, floorM2);
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
    ['Bathrooms', text(bathrooms)],
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
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex justify-end print:hidden"><ReportPrintButton /></div>

        {!isPro && (
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0c1715] shadow-[0_30px_100px_rgba(0,0,0,.4)]">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
            <div className="grid lg:grid-cols-[1.02fr_.98fr]">
              <div className="relative z-10 p-7 sm:p-10 lg:p-12">
                <div className="flex items-center gap-2">
                  <img src="/eixproplogo.png" alt="EiX Property Score" className="h-8 w-auto" />
                  <span className="rounded-full border border-teal-300/20 bg-teal-300/[0.07] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-teal-100">Founding Beta</span>
                </div>
                <p className="mt-9 text-[10px] font-bold uppercase tracking-[0.28em] text-teal-200">Property Intelligence</p>
                <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">{title}</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">{address}</p>
                <div className="mt-9">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Asking price</p>
                  <p className="mt-1 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{price}</p>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ['Bedrooms', text(facts.bedrooms)],
                    ['Bathrooms', text(bathrooms)],
                    ['Floor', floorM2 !== null ? \${number(floorM2)} m² : 'Not verified'],
                    ['Erf', landM2 !== null ? \${number(landM2)} m² : 'Not verified'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">{label}</p>
                      <p className="mt-2 text-lg font-black tracking-tight">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[380px] border-t border-white/10 lg:min-h-full lg:border-l lg:border-t-0">
                {primaryImageUrl ? (
                  <>
                    <img src={primaryImageUrl} alt="Property listing" className="absolute inset-0 h-full w-full object-cover" loading="eager" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c1715] via-black/5 to-black/20" />
                    <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-xl">
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">Source</p>
                      <p className="mt-1 text-xs text-white/80">Submitted property listing</p>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-[380px] items-center justify-center bg-gradient-to-br from-teal-300/10 to-black p-8 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Property image unavailable</p>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-white/10 bg-black/20 p-7 sm:p-9">
              <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200/75">EiX Buyer Signal</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{buyerSignal}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">{decisionBody}</p>
                </div>
                <div className="flex items-center gap-5 lg:min-w-[250px] lg:justify-end">
                  <div className="grid h-28 w-28 place-items-center rounded-full border border-teal-300/30 bg-teal-300/[0.07] shadow-[0_0_45px_rgba(45,212,191,.08)]">
                    <div className="text-center">
                      <p className="text-4xl font-black text-teal-200">{scoreNumber ?? '—'}</p>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-white/40">of 100</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Confidence</p>
                    <p className="mt-1 text-2xl font-black">{report.ai_confidence ?? 0}%</p>
                    <p className="mt-1 text-xs text-white/40">{report.confidence_label || 'Evidence-limited'}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

          <>
            <Section eyebrow="The EiX X-Ray" title="What the listing says is not the same as what it means.">
              <p className="mt-4 max-w-4xl text-sm leading-7 text-white/70">{insight}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SignalCard label="LAND" value={landM2 !== null ? `${number(landM2)} m² erf` : 'Not verified'} detail="Private land component." tone="positive" />
                <SignalCard label="BUILDING" value={floorM2 !== null ? `${number(floorM2)} m²` : 'Not verified'} detail={floorM2 !== null && askingPrice !== null ? `${psm2} asking price / m²` : 'Derived metric unavailable'} />
                <SignalCard label="FUNCTION" value={`${text(facts.parking)} parking`} detail={facts.hasGarden ? 'Private garden recorded.' : 'Garden not established.'} tone={facts.parking ? 'positive' : 'neutral'} />
                <SignalCard label="RUNNING COST" value={currency(typeof facts.ratesAndTaxesCents === 'number' ? facts.ratesAndTaxesCents : null)} detail="Stated rates & taxes." />
              </div>
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.04] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200/70">Positive buyer signal</p><p className="mt-2 text-lg font-bold">The property proposition is stronger than the bedroom count alone suggests.</p><p className="mt-2 text-sm leading-6 text-white/70">Renovation, land, parking, bathrooms, garden and fibre are relevant characteristics. EiX interprets them; it does not claim an independent inspection.</p></div>
                <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/70">Unresolved buyer signal</p><p className="mt-2 text-lg font-bold">The asking price has no sufficiently verified market anchor yet.</p><p className="mt-2 text-sm leading-6 text-white/70">That is the specific gap that can change the transaction decision — and therefore the gap EiX puts at the centre of this report.</p></div>
              </div>
            </Section>

            <Section eyebrow="The Biggest Question" title={`Does the market support ${price} for this particular property?`}>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <SignalCard label="ASKING" value={price} />
                <SignalCard label="ASKING / FLOOR m²" value={psm2} detail="Derived from verified asking price and floor area; not a valuation." />
                <SignalCard label="COMPARABLE MEDIAN" value={comparableMedian} detail={comparableCount > 0 ? `${comparableCount} verified comparable properties.` : 'No verified comparable set.'} tone={comparableCount > 0 ? 'positive' : 'attention'} />
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <p className="text-sm leading-7 text-white/65">{comparableCount > 0 ? `The subject is ${vsMedian} relative to the comparable asking-price median. Treat this as market evidence for investigation and negotiation, not as a formal valuation.` : `EiX could verify the asking price and physical profile, but it has not established enough verified comparable evidence to say whether ${price} is fair market value. The correct next move is to obtain genuinely comparable Observatory properties with reliable price, size, condition and property-type evidence.`}</p>
              </div>
            </Section>

            <Section eyebrow="EiX Decision Engine" title="What would change the decision?">
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">01 · Price evidence</p><p className="mt-3 font-bold">If comparable evidence supports the asking price</p><p className="mt-2 text-sm leading-6 text-white/70">Price concern reduces and the physical proposition becomes easier to assess on its own merits.</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">02 · Market pressure</p><p className="mt-3 font-bold">If comparable evidence clusters below the asking price</p><p className="mt-2 text-sm leading-6 text-white/70">Negotiation becomes materially more important. EiX does not invent a discount percentage.</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">03 · Income evidence</p><p className="mt-3 font-bold">If achievable rent produces weak economics</p><p className="mt-2 text-sm leading-6 text-white/70">The investment case weakens, even if the property is attractive to an owner-occupier.</p></div>
              </div>
            </Section>

            <Section eyebrow="EiX Evidence Map" title="The facts that actually move the decision.">
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <div className="hidden grid-cols-[1.2fr_1fr_.7fr] bg-white/[0.045] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/70 sm:grid"><span>Evidence</span><span>Finding</span><span>Decision impact</span></div>
                {evidenceMap.map(([finding, value, impact]) => (
                  <div key={finding} className="grid gap-1 border-t border-white/10 px-5 py-4 sm:grid-cols-[1.2fr_1fr_.7fr] sm:gap-4">
                    <span className="text-sm font-semibold">{finding}</span><span className="text-sm text-white/70">{value}</span><span className={`text-[10px] font-bold tracking-[0.12em] ${impact === 'VERY HIGH' ? 'text-amber-200' : 'text-white/60'}`}>{impact}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-white/70">Impact describes potential decision significance. It does not mean the underlying fact is independently verified beyond the evidence shown.</p>
            </Section>

            <Section eyebrow="Property Anatomy™" title="The property beyond the headline.">
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Land', landM2 !== null ? `${number(landM2)} m²` : 'Not verified'],
                  ['Building', floorM2 !== null ? `${number(floorM2)} m²` : 'Not verified'],
                  ['Bedrooms', text(facts.bedrooms)],
                  ['Bathrooms', text(bathrooms)],
                  ['Parking', text(facts.parking)],
                  ['Garden', yesNo(facts.hasGarden)],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[9px] uppercase tracking-[0.16em] text-white/70">{label}</p><p className="mt-2 text-lg font-bold">{value}</p></div>)}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Floor-area / erf ratio</p><p className="mt-2 text-3xl font-black">{floorErfRatio}</p><p className="mt-2 text-sm leading-6 text-white/65">This is a derived floor-area-to-erf relationship. It is not the property's stated site coverage.</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Why the ratio matters</p><p className="mt-2 text-lg font-bold">You can compare the physical proposition, not just the bedroom count.</p><p className="mt-2 text-sm leading-6 text-white/65">Land, internal space, outdoor space and parking can materially change how similar properties should be compared.</p></div>
              </div>
            </Section>

            <Section eyebrow="Why EiX Scored It" title={`${scoreNumber ?? '—'}/100 — explained in buyer language.`}>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <SignalCard label="PROPERTY EVIDENCE" value="Strong" detail={`${evidence.length} evidence records support the current analysis.`} tone="positive" />
                <SignalCard label="PROPERTY FUNDAMENTALS" value="Positive with limits" detail="The physical proposition is useful, but missing characteristics are never assumed to exist." />
                <SignalCard label="FINANCIAL CLARITY" value="Moderate" detail="Price and illustrative financing are calculable; rental economics and full ownership costs remain incomplete." />
                <SignalCard label="MARKET POSITION" value={comparableCount > 0 ? 'Evidence available' : 'Unresolved'} detail={comparableCount > 0 ? `${comparableCount} verified comparables inform the signal.` : 'The score is deliberately capped when market evidence is absent.'} tone={comparableCount > 0 ? 'positive' : 'attention'} />
              </div>
              <div className="mt-5 rounded-2xl border border-teal-300/15 bg-teal-300/[0.04] p-6"><p className="text-sm leading-7 text-white/65">The score is not a valuation. It tells you how much useful decision signal EiX can establish from the available property evidence and financial profile, while protecting the customer from a false market conclusion.</p></div>
            </Section>

            <Section eyebrow="Before You Make an Offer" title="Five questions EiX says you should answer.">
              <div className="mt-6 space-y-3">
                {buyerQuestions.map((question, index) => <div key={question} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-300/10 text-xs font-bold text-teal-200">{String(index + 1).padStart(2, '0')}</span><p className="pt-1 text-sm leading-6 text-white/70">{question}</p></div>)}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5"><div><p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/60">EiX Offer Readiness</p><p className="mt-1 text-xl font-black">{comparableCount > 0 ? 'Evidence-led' : '2 / 5'}</p></div><p className="max-w-md text-right text-xs leading-5 text-white/65">Do not negotiate from the asking price alone. Build your position from comparable evidence first.</p></div>
            </Section>

            <Section eyebrow="Negotiation Intelligence" title="Know what you need before you negotiate.">
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {negotiationItems.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[9px] uppercase tracking-[0.15em] text-white/70">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}
              </div>
              <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm font-semibold leading-6 text-white/70">EiX cannot responsibly recommend a discount percentage without verified comparable evidence. The product should give the buyer the evidence needed to negotiate, not manufacture a number that looks impressive.</p>
            </Section>

            <Section eyebrow="Acquisition Scenario" title="What the purchase could look like.">
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Purchase price', price],
                  ['10% deposit', askingPrice !== null ? currency(Math.round(askingPrice * 0.10)) : 'Not available'],
                  ['Estimated loan', currency(report.bond_loan_amount_cents)],
                  ['Illustrative monthly bond', currency(report.bond_monthly_payment_cents)],
                ].map(([label, value]) => <SignalCard key={label} label={label} value={value} />)}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"><p className="text-[10px] uppercase tracking-[0.16em] text-white/70">Cash requirement</p><p className="mt-2 text-sm leading-6 text-white/70">Deposit plus applicable transfer/acquisition costs and legal/conveyancing costs where relevant.</p></div>
                <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-6"><p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/60">Important</p><p className="mt-2 text-sm leading-6 text-white/70">This is an illustrative financing scenario, not a lending quote.</p></div>
              </div>
            </Section>

            <Section eyebrow="Property DNA™" title="How this property presents itself.">
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['OWNER-OCCUPIER', facts.hasGarden || facts.parking ? 'Strong practical relevance from garden and/or parking.' : 'Requires further evidence.'],
                  ['INVESTMENT', report.rental_yield_percent === null ? 'Requires verified rental evidence.' : `${report.rental_yield_percent}% gross rental yield available.`],
                  ['RENOVATED', renovated ? 'Listing-supported; inspect quality.' : 'Not established.'],
                  ['OUTDOOR SPACE', facts.hasGarden ? 'Private garden recorded.' : 'Not established.'],
                  ['PARKING', facts.parking !== null && facts.parking !== undefined ? `${facts.parking} spaces recorded.` : 'Not established.'],
                  ['CONNECTIVITY', facts.hasFibre ? 'Fibre recorded.' : 'Not established.'],
                  ['MARKET CERTAINTY', comparableCount > 0 ? 'Comparable evidence available.' : 'Needs comparable evidence.'],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[9px] font-bold tracking-[0.16em] text-teal-200/70">{label}</p><p className="mt-2 text-sm leading-6 text-white/70">{value}</p></div>)}
              </div>
            </Section>

            <Section eyebrow="Risk & Red Flags" title="What could change the decision?">
              <div className="mt-6 space-y-3">
                {risks.length > 0 ? risks.map((risk) => <div key={risk} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5 text-sm leading-6 text-white/65"><span className="mr-2 text-amber-200">!</span>{risk}</div>) : <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.04] p-5 text-sm text-white/60">No material red flags were generated from the available evidence.</div>}
              </div>
            </Section>

            <Section eyebrow="Due-Diligence Priorities" title="Exactly what should be verified next.">
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {limitations.length > 0 ? limitations.map((item, index) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/70">Priority {String(index + 1).padStart(2, '0')}</p><p className="mt-2 text-sm leading-6 text-white/60">{item}</p></div>) : <div className="rounded-2xl border border-teal-300/15 bg-teal-300/[0.04] p-5 text-sm text-white/60">No material evidence gaps were recorded.</div>}
              </div>
            </Section>

            <section className="mt-6 overflow-hidden rounded-[30px] border border-teal-300/20 bg-gradient-to-br from-teal-300/[0.09] via-white/[0.025] to-transparent p-7 sm:p-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-200">EiX Bottom Line</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">The property is interesting. The price is the test.</h2>
              <p className="mt-5 max-w-4xl text-base leading-8 text-white/70">The physical proposition is reasonably well defined: a {propertyType.toLowerCase()} with {text(facts.bedrooms)} bedrooms, {text(bathrooms)} bathrooms{landM2 !== null ? `, a ${number(landM2)} m² erf` : ''}{floorM2 !== null ? ` and ${number(floorM2)} m² floor area` : ''}{facts.parking !== null && facts.parking !== undefined ? `, ${facts.parking} parking spaces` : ''}{facts.hasGarden ? ', garden' : ''}{facts.hasFibre ? ' and fibre' : ''}.</p>
              <p className="mt-4 max-w-4xl text-base leading-8 text-white/70">The next decision should not be <strong className="text-white">“Do I like the property?”</strong> It should be <strong className="text-white">“Does the market support {price} for this particular property?”</strong></p>
              <p className="mt-4 max-w-4xl text-base font-semibold leading-8 text-white">{comparableCount === 0 ? 'Resolve that question before committing to an offer.' : 'Review the comparable evidence and property-specific differences before committing to an offer.'}</p>
            </section>

            <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.025] p-6 sm:p-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Your Next EiX Decision</p><h2 className="mt-2 text-2xl font-black">The next layer is where deeper evidence becomes valuable.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">The R149 report identifies the decision bottleneck. The Investor Report is designed to go deeper into the evidence required to act on it.</p></div>
                <div className="shrink-0 rounded-2xl border border-teal-300/20 bg-teal-300/[0.06] px-6 py-5"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-teal-200/70">EiX Investor Report</p><p className="mt-1 text-2xl font-black">R349</p></div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {['Comparable Market Analysis', 'Rental & Yield Intelligence', 'Investment Scenario Modelling', 'Negotiation Intelligence', 'Risk & Due-Diligence Analysis', 'Investor Decision Brief'].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">{item}</div>)}
              </div>
            </section>
          </>
        )}

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300">Evidence & Sources</p>
          <h2 className="mt-2 text-2xl font-bold">Audit trail</h2>
          <p className="mt-2 text-sm text-white/65">The detailed evidence layer sits underneath the decision layer so the customer sees the intelligence first and can audit the source facts when needed.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {verifiedFacts.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[9px] uppercase tracking-[0.14em] text-white/70">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}
          </div>
          <p className="mt-5 text-xs text-white/70">Evidence records attached: {evidence.length}</p>
        </section>

        {internationalBuyer?.profile?.buyerType === 'international' && (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300">International Buyer Intelligence</p>
            <h2 className="mt-2 text-2xl font-bold">Cross-border acquisition context</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Evidence-led intelligence for international purchasers. This does not constitute legal, tax, immigration or formal valuation advice.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SignalCard label="Buyer country" value={text(internationalBuyer.profile?.buyerCountry)} />
              <SignalCard label="Purpose" value={text(internationalBuyer.profile?.buyerPurpose)} />
              <SignalCard label="Budget" value={text(internationalBuyer.profile?.buyerBudget)} />
              <SignalCard label="Market position" value={text(internationalBuyer.marketPosition)} />
            </div>
          </section>
        )}

        {isPro && (
          <section className="mt-6 rounded-[28px] border border-teal-300/15 bg-white/[0.02] p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300">Investor Analysis</p>
            <h2 className="mt-2 text-2xl font-bold">Deeper investment intelligence</h2>
            <p className="mt-2 text-sm text-white/65">The Investor Report retains its evidence-backed acquisition analysis.</p>
            {proSections.map(([sectionTitle, section]) => section && <div key={sectionTitle} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5"><div className="flex justify-between gap-4"><h3 className="font-semibold">{sectionTitle}</h3><span className="text-[10px] uppercase tracking-[0.12em] text-white/70">{text(section?.status, 'INSUFFICIENT_DATA')}</span></div><p className="mt-2 text-sm leading-6 text-white/70">{text(section?.summary)}</p></div>)}
          </section>
        )}

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">Method & Important Limitations</p>
          <p className="mt-3 text-sm leading-7 text-white/65">EiX Property Score™ provides property decision intelligence based on available evidence and stated assumptions. It is not a formal property valuation, financial advice, legal advice, tax advice or investment guarantee. Information should be independently verified before making a transaction decision.</p>
          {assumptions.length > 0 && <div className="mt-5"><p className="text-sm font-semibold">Scenario assumptions</p><ul className="mt-3 space-y-2 text-sm text-white/65">{assumptions.map((item) => <li key={item}>• {item}</li>)}</ul></div>}
        </section>

        <p className="mt-8 pb-8 text-center text-[10px] uppercase tracking-[0.18em] text-white/20">EiX Property Score™ · Listing data → interpretation → decision intelligence → action</p>
      </div>
    </main>
  );
}
