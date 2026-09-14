import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, IntelligenceSignal } from './types';

export interface InvestmentIntelligence {
  pricePerM2: IntelligenceSignal<number>;
  askingPriceSignal: IntelligenceSignal<number>;
}

export interface InvestmentInputs {
  comparablePricePerM2?: number | null;
  estimatedMarketPriceCents?: number | null;
}

export function buildInvestmentIntelligence(context: IntelligenceContext, input: InvestmentInputs = {}): InvestmentIntelligence {
  const pricePerM2 = context.askingPriceCents != null && context.landSizeM2 != null && context.landSizeM2 > 0
    ? (context.askingPriceCents / 100) / context.landSizeM2
    : null;
  const askingSignal = input.comparablePricePerM2 != null && pricePerM2 != null && input.comparablePricePerM2 > 0
    ? Math.round((pricePerM2 / input.comparablePricePerM2) * 100)
    : null;

  return {
    pricePerM2: pricePerM2 == null
      ? unknownSignal('investment.pricePerM2', 'Asking price per m²', 'Price-per-m² requires verified asking price and land/floor-area evidence.')
      : calculatedSignal('investment.pricePerM2', 'Asking price per m²', Math.round(pricePerM2), 95, 'Calculated from verified asking price and land size.'),
    askingPriceSignal: askingSignal == null
      ? unknownSignal('investment.askingPriceSignal', 'Comparable price signal', 'A comparable price-per-m² dataset is required before generating a market-relative signal.')
      : calculatedSignal('investment.askingPriceSignal', 'Comparable price signal', askingSignal, 70, 'Calculated as the subject asking price per m² relative to supplied comparable pricing.'),
  };
}
