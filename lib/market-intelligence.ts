import type { PropertyFacts } from '@/lib/property-types';
import type { ComparableProperty } from '@/lib/property24-comparables';

export interface MarketIntelligence {
  comparableCount: number;
  askingPriceCents: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  pricePerM2Cents: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  subjectPricePerM2Cents: number | null;
  subjectVsMedianPercent: number | null;
  marketPosition:
    | 'Below Comparable Median'
    | 'At Comparable Median'
    | 'Above Comparable Median'
    | 'Insufficient Data';
  methodology: 'active_asking_price';
  disclaimer: 'Active asking-price comparison — not a valuation.';
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function subjectPricePerM2(facts: PropertyFacts): number | null {
  if (
    facts.askingPriceCents === null ||
    facts.floorSizeM2 === null ||
    facts.floorSizeM2 <= 0
  ) {
    return null;
  }

  return facts.askingPriceCents / facts.floorSizeM2;
}

export function calculateMarketIntelligence(
  subject: PropertyFacts,
  comparables: ComparableProperty[],
): MarketIntelligence {
  const askingPrices = comparables
    .map((comparable) => comparable.facts.askingPriceCents)
    .filter((value): value is number => value !== null);

  const comparablePricePerM2 = comparables
    .map((comparable) => {
      const price = comparable.facts.askingPriceCents;
      const floor = comparable.facts.floorSizeM2;

      if (price === null || floor === null || floor <= 0) {
        return null;
      }

      return price / floor;
    })
    .filter((value): value is number => value !== null);

  const askingPriceMedian = median(askingPrices);
  const subjectPrice = subject.askingPriceCents;
  const comparableEvidenceThreshold = 3;
  const hasEnoughComparables = comparables.length >= comparableEvidenceThreshold;

  let subjectVsMedianPercent: number | null = null;

  if (
    hasEnoughComparables &&
    subjectPrice !== null &&
    askingPriceMedian !== null &&
    askingPriceMedian > 0
  ) {
    subjectVsMedianPercent =
      ((subjectPrice - askingPriceMedian) / askingPriceMedian) * 100;
  }

  let marketPosition: MarketIntelligence['marketPosition'] =
    'Insufficient Data';

  if (subjectVsMedianPercent !== null) {
    if (Math.abs(subjectVsMedianPercent) < 0.5) {
      marketPosition = 'At Comparable Median';
    } else if (subjectVsMedianPercent < 0) {
      marketPosition = 'Below Comparable Median';
    } else {
      marketPosition = 'Above Comparable Median';
    }
  }

  return {
    comparableCount: comparables.length,
    askingPriceCents: {
      min: askingPrices.length > 0 ? Math.min(...askingPrices) : null,
      median: askingPriceMedian,
      max: askingPrices.length > 0 ? Math.max(...askingPrices) : null,
    },
    pricePerM2Cents: {
      min:
        comparablePricePerM2.length > 0
          ? Math.min(...comparablePricePerM2)
          : null,
      median: median(comparablePricePerM2),
      max:
        comparablePricePerM2.length > 0
          ? Math.max(...comparablePricePerM2)
          : null,
    },
    subjectPricePerM2Cents: subjectPricePerM2(subject),
    subjectVsMedianPercent,
    marketPosition,
    methodology: 'active_asking_price',
    disclaimer: 'Active asking-price comparison — not a valuation.',
  };
}
