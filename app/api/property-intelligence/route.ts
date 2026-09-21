import { NextRequest, NextResponse } from 'next/server';
import { extractPropertyFromUrl } from '@/lib/secure-property-extractor';
import { discoverProperty24Comparables } from '@/lib/property24-comparable-discovery';
import { calculateMarketIntelligence } from '@/lib/market-intelligence';
import { getNeighbourhoodIntelligence } from '@/lib/neighbourhood-intelligence';
import type { PropertyFacts } from '@/lib/property-types';

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

function buyerImplications(facts: PropertyFacts, market: ReturnType<typeof calculateMarketIntelligence>) {
  const items: Array<{ field: string; status: 'available' | 'missing' | 'limited'; meaning: string; action: string }> = [];

  const add = (field: string, available: boolean, meaning: string, action: string) => {
    items.push({ field, status: available ? 'available' : 'missing', meaning, action });
  };

  add(
    'asking price',
    facts.askingPriceCents !== null,
    facts.askingPriceCents !== null
      ? 'The asking price is established from the supplied listing evidence.'
      : 'The asking price could not be established from the supplied listing evidence.',
    facts.askingPriceCents !== null
      ? market.verifiedAchievedSaleCount >= 3
        ? 'Compare it with the verified achieved-sale benchmark below.'
        : 'Obtain at least 3 genuinely comparable achieved sales before treating the asking price as market-supported.'
      : 'Confirm the asking price directly with the agent or source listing.',
  );

  add(
    'floor area',
    facts.floorSizeM2 !== null,
    facts.floorSizeM2 !== null
      ? `Floor area is recorded as ${facts.floorSizeM2} m², allowing a price-per-m² analysis.`
      : 'Floor area is not established, so a meaningful R/m² comparison cannot be completed.',
    facts.floorSizeM2 !== null ? 'Use floor area together with genuinely comparable sales.' : 'Request the measured floor area and supporting property documentation.',
  );

  add(
    'land area',
    facts.landSizeM2 !== null,
    facts.landSizeM2 !== null
      ? `Land area is recorded as ${facts.landSizeM2} m².`
      : 'Land/erf area is not established.',
    facts.landSizeM2 !== null ? 'Use it when comparing land component and property scale.' : 'Confirm erf/land size against reliable property documentation.',
  );

  add(
    'rates',
    facts.ratesAndTaxesCents !== null,
    facts.ratesAndTaxesCents !== null
      ? 'A rates figure was found in the supplied listing evidence; it should still be confirmed against the latest municipal account.'
      : 'Municipal rates are not established.',
    'Request the latest municipal account and confirm current charges and arrears.',
  );

  add(
    'levy',
    facts.leviesCents !== null,
    facts.leviesCents !== null
      ? 'A levy figure was found in the supplied listing evidence; confirm whether it is current and whether special levies apply.'
      : 'Levy exposure is not established.',
    'Confirm title/estate structure and obtain the latest levy statement where applicable.',
  );

  if (market.verifiedAchievedSaleCount < 3) {
    items.push({
      field: 'price fairness',
      status: 'limited',
      meaning: 'Price fairness cannot currently be established from sufficient verified achieved-sale evidence.',
      action: 'Obtain or connect a trusted achieved-sale data source and require at least 3 genuinely comparable achieved sales before producing a price benchmark.',
    });
  }

  return items;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { listingUrl?: unknown };
    const listingUrl = clean(body.listingUrl);

    if (!listingUrl) {
      return NextResponse.json({ error: 'listingUrl is required.' }, { status: 400 });
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
      }, { status: 422 });
    }

    const facts = extraction.facts;
    const comparables = await discoverProperty24Comparables(listingUrl, facts);
    const market = calculateMarketIntelligence(facts, comparables);
    const neighbourhood = await getNeighbourhoodIntelligence(facts);

    return NextResponse.json({
      status: 'ready',
      promise: 'Know the property before you buy or invest.',
      source: extraction.source,
      sourceUrl: extraction.sourceUrl,
      listingArea: deriveListingArea(facts),
      facts,
      evidence: extraction.evidence,
      market: {
        ...market,
        achievedSaleEvidenceStatus: market.verifiedAchievedSaleCount >= 3 ? 'sufficient' : 'insufficient',
        activeListingEvidenceStatus: market.activeListingCount > 0 ? 'available' : 'not_retrieved',
      },
      neighbourhood,
      buyerImplications: buyerImplications(facts, market),
      limitations: [
        ...(market.verifiedAchievedSaleCount < 3
          ? ['No sufficient verified achieved-sale dataset is currently connected; active listings are context only and cannot establish price fairness.']
          : []),
        'Listing-sourced rates, levies, dimensions and features remain subject to primary-document confirmation.',
        'Neighbourhood distances are approximate and do not verify the exact property address when the source does not disclose it.',
      ],
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Property intelligence request failed.',
    }, { status: 500 });
  }
}
