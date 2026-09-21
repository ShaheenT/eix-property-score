import type { PropertyFacts } from '@/lib/property-types';
import type { ComparableProperty } from '@/lib/property24-comparables';

export interface MarketIntelligence {
  comparableCount: number;
  verifiedAchievedSaleCount: number;
  pendingSaleCount: number;
  activeListingCount: number;
  askingPriceCents: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  achievedSalePriceCents: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  pricePerM2Cents: {
    min: number | null;
    median: number | null;
    max: number | null;
  };
  achievedPricePerM2Cents: {
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
  methodology: 'achieved_sales_first';
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
  const achievedSales = comparables.filter(
    (comparable) => comparable.saleStatus === 'registered_sale',
  );
  const pendingSales = comparables.filter(
    (comparable) => comparable.saleStatus === 'pending_sale',
  );
  const activeListings = comparables.filter(
    (comparable) => !comparable.saleStatus || comparable.saleStatus === 'active_listing',
  );

  // Only registered achieved sales can establish price fairness.
  const activeAskingPrices = activeListings
    .map((comparable) => comparable.facts.askingPriceCents)
    .filter((value): value is number => value !== null);

  const achievedSalePrices = achievedSales
    .map((comparable) => comparable.facts.askingPriceCents)
    .filter((value): value is number => value !== null);

  const activeComparablePricePerM2 = activeListings
    .map((comparable) => {
      const price = comparable.facts.askingPriceCents;
      const floor = comparable.facts.floorSizeM2;
      if (price === null || floor === null || floor <= 0) return null;
      return price / floor;
    })
    .filter((value): value is number => value !== null);

  const achievedComparablePricePerM2 = achievedSales
    .map((comparable) => {
      const price = comparable.facts.askingPriceCents;
      const floor = comparable.facts.floorSizeM2;

      if (price === null || floor === null || floor <= 0) {
        return null;
      }

      return price / floor;
    })
    .filter((value): value is number => value !== null);

  const askingPriceMedian = median(activeAskingPrices);
  const achievedSaleMedian = median(achievedSalePrices);
  const subjectPrice = subject.askingPriceCents;

  let subjectVsMedianPercent: number | null = null;

  if (
    subjectPrice !== null &&
    achievedSaleMedian !== null &&
    achievedSaleMedian > 0 &&
    achievedSales.length >= 3
  ) {
    subjectVsMedianPercent =
      ((subjectPrice - achievedSaleMedian) / achievedSaleMedian) * 100;
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
    verifiedAchievedSaleCount: achievedSales.length,
    pendingSaleCount: pendingSales.length,
    activeListingCount: activeListings.length,
    askingPriceCents: {
      min: activeAskingPrices.length > 0 ? Math.min(...activeAskingPrices) : null,
      median: askingPriceMedian,
      max: activeAskingPrices.length > 0 ? Math.max(...activeAskingPrices) : null,
    },
    achievedSalePriceCents: {
      min: achievedSalePrices.length > 0 ? Math.min(...achievedSalePrices) : null,
      median: achievedSaleMedian,
      max: achievedSalePrices.length > 0 ? Math.max(...achievedSalePrices) : null,
    },
    pricePerM2Cents: {
      min:
        activeComparablePricePerM2.length > 0
          ? Math.min(...activeComparablePricePerM2)
          : null,
      median: median(activeComparablePricePerM2),
      max:
        activeComparablePricePerM2.length > 0
          ? Math.max(...activeComparablePricePerM2)
          : null,
    },
    achievedPricePerM2Cents: {
      min:
        achievedComparablePricePerM2.length > 0
          ? Math.min(...achievedComparablePricePerM2)
          : null,
      median: median(achievedComparablePricePerM2),
      max:
        achievedComparablePricePerM2.length > 0
          ? Math.max(...achievedComparablePricePerM2)
          : null,
    },
    subjectPricePerM2Cents: subjectPricePerM2(subject),
    subjectVsMedianPercent,
    marketPosition,
    methodology: 'active_asking_price',
    disclaimer: 'Active asking-price comparison — not a valuation.',
  };
}
