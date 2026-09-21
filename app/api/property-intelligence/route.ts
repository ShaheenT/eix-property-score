import { NextRequest, NextResponse } from 'next/server';
import { extractPropertyFromUrl } from '@/lib/secure-property-extractor';
import { discoverProperty24Comparables } from '@/lib/property24-comparable-discovery';
import { calculateMarketIntelligence } from '@/lib/market-intelligence';
import { getNeighbourhoodIntelligence } from '@/lib/neighbourhood-intelligence';
import type { PropertyFacts } from '@/lib/property-types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type EvidenceStatus = 'available' | 'missing' | 'limited';

interface BuyerImplication {
  field: string;
  status: EvidenceStatus;
  evidence: string;
  meaning: string;
  exposure: string;
  action: string;
  protection: string;
}

interface SourceHealth {
  source: string;
  status: 'available' | 'not_available' | 'failed';
  detail: string;
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function deriveListingArea(facts: PropertyFacts): string | null {
  const direct = clean(facts.suburb);
  if (direct) return direct;

  const title = clean(facts.title);
  const match = title?.match(/\bfor\s+sale\s+in\s+(.+)$/i);
  return match?.[1]?.replace(/\s*[|,].*$/, '').trim() || clean(facts.city);
}

function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

function buyerImplications(
  facts: PropertyFacts,
  market: ReturnType<typeof calculateMarketIntelligence>,
): BuyerImplication[] {
  const items: BuyerImplication[] = [];

  const add = (
    field: string,
    status: EvidenceStatus,
    evidence: string,
    meaning: string,
    exposure: string,
    action: string,
    protection: string,
  ) => items.push({ field, status, evidence, meaning, exposure, action, protection });

  const priceAvailable = facts.askingPriceCents !== null;
  add(
    'asking price',
    priceAvailable ? 'available' : 'missing',
    priceAvailable ? 'The asking price was extracted from the supplied listing.' : 'The asking price was not established from the supplied listing.',
    priceAvailable ? 'The report can model acquisition and financing scenarios from the stated asking price.' : 'Without a verified asking price, acquisition scenarios cannot be anchored.',
    priceAvailable ? 'The asking price is not evidence that the market supports that price.' : 'Any financial scenario would be speculative.',
    priceAvailable ? (market.verifiedAchievedSaleCount >= 3
      ? 'Review the achieved-sale benchmark and comparable methodology.'
      : 'Obtain at least 3 genuinely comparable achieved sales before treating the asking price as market-supported.')
      : 'Confirm the current asking price directly with the agent.',
    priceAvailable ? 'Do not treat the listing price as a valuation.' : 'Do not make an offer using an unverified price.',
  );

  const floorAvailable = facts.floorSizeM2 !== null && facts.floorSizeM2 > 0;
  add(
    'floor area',
    floorAvailable ? 'available' : 'missing',
    floorAvailable ? `Floor area is recorded as ${facts.floorSizeM2} m².` : 'Floor area was not established.',
    floorAvailable ? 'A size-adjusted price-per-m² analysis can be performed.' : 'A meaningful R/m² comparison cannot be completed.',
    floorAvailable ? 'R/m² still depends on genuinely comparable properties and consistent measurement.' : 'The buyer cannot reliably compare the asking price on a size-adjusted basis.',
    floorAvailable ? 'Compare R/m² only with comparable properties using compatible floor-area definitions.' : 'Request measured floor area and supporting plans or reliable records.',
    'Do not rely on an R/m² conclusion until the measurement basis is confirmed.',
  );

  const landAvailable = facts.landSizeM2 !== null && facts.landSizeM2 > 0;
  add(
    'land area',
    landAvailable ? 'available' : 'missing',
    landAvailable ? `Land/erf area is recorded as ${facts.landSizeM2} m².` : 'Land/erf area was not established.',
    landAvailable ? 'The land component can be considered when comparing similar properties.' : 'Property scale and land contribution cannot be properly compared.',
    landAvailable ? 'Land size alone does not establish development rights or value.' : 'Comparable selection may be materially weaker.',
    landAvailable ? 'Confirm the figure against title/property records where material.' : 'Confirm erf/land size against reliable property documentation.',
    'Do not assume the listing dimensions are legally verified.',
  );

  const ratesAvailable = facts.ratesAndTaxesCents !== null;
  add(
    'municipal rates',
    ratesAvailable ? 'available' : 'missing',
    ratesAvailable ? 'A rates figure was found in the supplied listing evidence.' : 'Municipal rates were not established.',
    ratesAvailable ? 'A preliminary ownership-cost input exists, but it is not a current municipal-account verification.' : 'The true monthly carrying cost remains incomplete.',
    'Outstanding amounts, reassessments or changes to the municipal account may affect the transaction.',
    'Request the latest municipal account and confirm current charges and arrears.',
    'Do not treat a listing-supplied rates figure as a final settlement amount.',
  );

  const levyAvailable = facts.leviesCents !== null;
  add(
    'levies',
    levyAvailable ? 'available' : 'missing',
    levyAvailable ? 'A levy figure was found in the supplied listing evidence.' : 'Levy exposure was not established.',
    levyAvailable ? 'A preliminary levy input exists; current charges and special levies still need confirmation.' : 'Ownership costs cannot be completed if an estate/body-corporate levy applies.',
    'Special levies, arrears and changes to the levy budget can materially change monthly costs.',
    'Confirm the title/estate structure and obtain the latest levy statement where applicable.',
    'Do not rely on an advertised levy figure without current supporting documentation.',
  );

  const marketLimited = market.verifiedAchievedSaleCount < 3;
  add(
    'price fairness',
    marketLimited ? 'limited' : 'available',
    `${market.verifiedAchievedSaleCount} verified achieved-sale comparables are currently available.`,
    marketLimited
      ? 'EiX cannot establish an achieved-sale price benchmark yet.'
      : 'The achieved-sale dataset meets the minimum evidence gate for a benchmark.',
    marketLimited
      ? 'The asking price may be above, below or around the relevant market level; the direction cannot be established from insufficient achieved-sale evidence.'
      : 'A benchmark remains evidence-based context, not a formal valuation.',
    marketLimited
      ? 'Connect or obtain a trusted achieved-sale dataset and require at least 3 genuinely comparable sales.'
      : 'Review comparable selection, dates, location and property characteristics before relying on the benchmark.',
    'Do not make a price opinion when the evidence gate is not met.',
  );

  add(
    'documents & condition',
    'limited',
    'Listing evidence does not establish approved plans, compliance certificates, title conditions, heritage status or physical condition.',
    'These are transaction-critical verification items rather than assumptions that EiX should infer.',
    'Unverified alterations, defects, restrictions or approvals can create financial and transaction risk.',
    'Request approved plans, applicable compliance certificates, title/property documentation and an independent inspection.',
    'Make the offer conditional on satisfactory due diligence where appropriate.',
  );

  return items;
}

function propertySignals(facts: PropertyFacts) {
  const signals: Array<{ signal: string; status: EvidenceStatus; meaning: string; nextAction: string }> = [];

  const add = (signal: string, status: EvidenceStatus, meaning: string, nextAction: string) =>
    signals.push({ signal, status, meaning, nextAction });

  add(
    'Owner-occupier fit',
    facts.bedrooms !== null && facts.bathrooms !== null ? 'available' : 'limited',
    facts.bedrooms !== null && facts.bathrooms !== null
      ? `${facts.bedrooms} bedrooms and ${facts.bathrooms} bathrooms establish a basic household profile; lifestyle fit still requires buyer-specific assessment.`
      : 'The supplied property profile is incomplete.',
    'Confirm layout, room dimensions, parking and outdoor space during inspection.',
  );

  add(
    'Investment',
    'limited',
    'No verified rental income, vacancy history or operating-cost dataset is established by this API.',
    'Obtain comparable rentals and verify realistic achievable rent before calculating yield or cash flow.',
  );

  add(
    'Outdoor living',
    facts.hasGarden !== null || facts.hasPool !== null ? 'available' : 'limited',
    facts.hasGarden !== null || facts.hasPool !== null
      ? 'The listing provides at least some evidence about outdoor features.'
      : 'Outdoor features are not sufficiently established from the supplied evidence.',
    'Verify garden, pool, orientation, condition and usable outdoor area during inspection.',
  );

  add(
    'Parking',
    facts.garages !== null || facts.parking !== null ? 'available' : 'missing',
    facts.garages !== null || facts.parking !== null
      ? `Parking evidence is present: ${facts.garages !== null ? `${facts.garages} garage(s)` : ''}${facts.parking !== null ? `${facts.parking} parking space(s)` : ''}.`
      : 'Parking was not established from the supplied evidence.',
    'Confirm parking allocation, dimensions and whether it is exclusive or shared.',
  );

  add(
    'Utilities / resilience',
    facts.hasFibre !== null || facts.hasSolar !== null || facts.hasBatteryBackup !== null ? 'available' : 'limited',
    facts.hasFibre !== null || facts.hasSolar !== null || facts.hasBatteryBackup !== null
      ? 'The listing contains evidence about at least one utility/resilience feature.'
      : 'Fibre, solar and backup-power status is not sufficiently established.',
    'Verify installation, ownership, capacity, transferability and current working condition.',
  );

  return signals;
}

function dueDiligence(facts: PropertyFacts) {
  return [
    {
      priority: 'HIGH',
      item: 'Price evidence',
      status: 'required',
      why: 'Price fairness cannot be established without sufficient verified achieved-sale evidence.',
      action: 'Obtain at least 3 genuinely comparable achieved sales.',
    },
    {
      priority: 'HIGH',
      item: 'Property dimensions',
      status: facts.floorSizeM2 !== null && facts.landSizeM2 !== null ? 'partially established' : 'required',
      why: 'Floor and land measurements affect comparability and R/m² analysis.',
      action: 'Confirm measured floor area and erf/land area against reliable records.',
    },
    {
      priority: 'HIGH',
      item: 'Plans and approvals',
      status: 'not verified',
      why: 'Listing evidence does not establish that the current improvements are approved.',
      action: 'Request approved plans and verify that additions/alterations correspond to the current property.',
    },
    {
      priority: 'HIGH',
      item: 'Compliance',
      status: 'not verified',
      why: 'Applicable electrical, gas, plumbing or other compliance requirements are not established by listing evidence.',
      action: 'Request applicable current compliance certificates and have them checked.',
    },
    {
      priority: 'HIGH',
      item: 'Physical condition',
      status: 'not verified',
      why: 'A listing cannot substitute for an independent inspection.',
      action: 'Arrange an independent inspection before making an unconditional commitment.',
    },
    {
      priority: 'MEDIUM',
      item: 'Municipal account',
      status: facts.ratesAndTaxesCents !== null ? 'listing input only' : 'not verified',
      why: 'Current rates, arrears and municipal charges require primary-document confirmation.',
      action: 'Request the latest municipal account and settlement information where applicable.',
    },
    {
      priority: 'MEDIUM',
      item: 'Title / restrictions / heritage',
      status: 'not verified',
      why: 'EiX does not currently verify title conditions, servitudes, zoning, heritage or development restrictions from the listing alone.',
      action: 'Obtain the relevant property/title/planning documentation and professional confirmation where required.',
    },
  ];
}

function sourceHealth(
  extraction: Awaited<ReturnType<typeof extractPropertyFromUrl>>,
  market: ReturnType<typeof calculateMarketIntelligence>,
  neighbourhoodAvailable: boolean,
): SourceHealth[] {
  return [
    {
      source: extraction.source,
      status: extraction.status === 'extracted' ? 'available' : 'failed',
      detail: extraction.status === 'extracted' ? 'Primary listing extraction completed.' : extraction.errors.join(' ') || 'Listing extraction did not complete.',
    },
    {
      source: 'Property24 active-market discovery',
      status: market.activeListingCount > 0 ? 'available' : 'not_available',
      detail: market.activeListingCount > 0
        ? `${market.activeListingCount} active listing(s) were discovered for context.`
        : 'No active Property24 comparable evidence was retrieved for this request.',
    },
    {
      source: 'Verified achieved-sale data',
      status: market.verifiedAchievedSaleCount >= 3 ? 'available' : 'not_available',
      detail: market.verifiedAchievedSaleCount >= 3
        ? `${market.verifiedAchievedSaleCount} achieved sales meet the minimum benchmark gate.`
        : 'No connected source currently provides enough verified achieved-sale evidence to establish a price benchmark.',
    },
    {
      source: 'OpenStreetMap neighbourhood evidence',
      status: neighbourhoodAvailable ? 'available' : 'not_available',
      detail: neighbourhoodAvailable
        ? 'Nearby-place evidence was retrieved from OpenStreetMap.'
        : 'Neighbourhood place evidence was unavailable for this request.',
    },
  ];
}

export async function POST(request: NextRequest) {
  let listingUrl: string | null = null;

  try {
    const body = await request.json() as { listingUrl?: unknown };
    listingUrl = clean(body.listingUrl);

    if (!listingUrl) {
      return NextResponse.json({
        status: 'invalid_request',
        error: 'listingUrl is required.',
      }, { status: 400 });
    }

    try {
      new URL(listingUrl);
    } catch {
      return NextResponse.json({
        status: 'invalid_request',
        error: 'listingUrl must be a valid absolute URL.',
      }, { status: 400 });
    }

    const extraction = await extractPropertyFromUrl(listingUrl);

    if (extraction.status !== 'extracted') {
      return NextResponse.json({
        status: extraction.status,
        source: extraction.source,
        sourceUrl: extraction.sourceUrl,
        errors: extraction.errors,
        facts: extraction.facts,
        evidence: extraction.evidence,
        sourceHealth: sourceHealth(extraction, calculateMarketIntelligence(extraction.facts, []), false),
        buyerImplications: buyerImplications(extraction.facts, calculateMarketIntelligence(extraction.facts, [])),
        limitations: [
          'The supplied listing could not be fully extracted.',
          'No unsupported property facts are inferred to compensate for the extraction failure.',
        ],
      }, { status: 422 });
    }

    const facts = extraction.facts;

    // These external sources are deliberately isolated. One upstream outage must
    // never turn a valid listing extraction into a 500 response.
    const [comparablesResult, neighbourhoodResult] = await Promise.allSettled([
      safe(discoverProperty24Comparables(listingUrl, facts), []),
      safe(getNeighbourhoodIntelligence(facts), {
        location: {
          label: deriveListingArea(facts),
          areaLabel: deriveListingArea(facts),
          city: clean(facts.city),
          province: clean(facts.province),
          latitude: null,
          longitude: null,
          verified: false,
          source: deriveListingArea(facts) ? 'listing_title' as const : 'none' as const,
          sourceUrl: null,
        },
        transport: [],
        schoolsHealthcare: [],
        lifestyleRetail: [],
        safetyIndicators: [],
        parksRecreation: [],
      }),
    ]);

    const comparables = comparablesResult.status === 'fulfilled' ? comparablesResult.value : [];
    const neighbourhood = neighbourhoodResult.status === 'fulfilled' ? neighbourhoodResult.value : null;
    const market = calculateMarketIntelligence(facts, comparables);
    const implications = buyerImplications(facts, market);

    const limitations = [
      ...(market.verifiedAchievedSaleCount < 3
        ? ['No sufficient verified achieved-sale dataset is currently connected; active asking listings are context only and cannot establish price fairness.']
        : []),
      ...(market.activeListingCount === 0
        ? ['No active comparable listing evidence was retrieved from the supported listing source for this request.']
        : []),
      ...(facts.address === null
        ? ['The exact street address was not verified from the supplied listing; neighbourhood context is anchored to the stated area where possible.']
        : []),
      'Listing-sourced rates, levies, dimensions and features remain subject to primary-document confirmation.',
      'EiX does not currently verify approved plans, compliance certificates, title restrictions, heritage status, zoning or physical condition from listing evidence alone.',
    ];

    return NextResponse.json({
      status: 'ready',
      partial: comparablesResult.status === 'rejected' || neighbourhoodResult.status === 'rejected',
      promise: 'Know the property before you buy or invest.',
      source: extraction.source,
      sourceUrl: extraction.sourceUrl,
      listingArea: deriveListingArea(facts),
      facts,
      evidence: extraction.evidence,
      conflicts: extraction.metadata?.conflicts ?? [],
      market: {
        ...market,
        achievedSaleEvidenceStatus: market.verifiedAchievedSaleCount >= 3 ? 'sufficient' : 'insufficient',
        activeListingEvidenceStatus: market.activeListingCount > 0 ? 'available' : 'not_retrieved',
      },
      buyerImplications: implications,
      propertySignals: propertySignals(facts),
      neighbourhood,
      dueDiligence: dueDiligence(facts),
      nextMove: implications
        .filter((item) => item.status !== 'available')
        .slice(0, 7)
        .map((item, index) => ({
          priority: index + 1,
          action: item.action,
          reason: item.meaning,
          protection: item.protection,
        })),
      sourceHealth: sourceHealth(
        extraction,
        market,
        Boolean(neighbourhood && (
          neighbourhood.transport.length ||
          neighbourhood.schoolsHealthcare.length ||
          neighbourhood.lifestyleRetail.length ||
          neighbourhood.safetyIndicators.length ||
          neighbourhood.parksRecreation.length
        )),
      ),
      limitations,
      methodology: {
        market: 'Achieved-sale evidence first. Active asking listings and pending sales are context only.',
        neighbourhood: 'OpenStreetMap nearby-place evidence; when exact address is unavailable, the stated listing area is used as an approximate anchor.',
        documents: 'Listing evidence is not treated as verification of legal, planning, title, heritage, compliance or physical-condition documents.',
      },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Property intelligence request failed.',
      listingUrl,
      message: 'The intelligence request failed unexpectedly. No property facts were fabricated or substituted.',
    }, { status: 500 });
  }
}
