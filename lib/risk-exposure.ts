import type { PropertyFacts } from '@/lib/property-types';
import type { MarketIntelligence } from '@/lib/market-intelligence';

export interface RiskExposure {
  category: 'PRICE' | 'CASH_FLOW' | 'DOCUMENTS' | 'PROPERTY';
  exposure: string;
  action: string;
  protection: string;
}

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';

export function buildRiskExposures(facts: PropertyFacts, market: MarketIntelligence): RiskExposure[] {
  const exposures: RiskExposure[] = [];

  if (market.verifiedAchievedSaleCount < 3) {
    exposures.push({
      category: 'PRICE',
      exposure: 'Price fairness cannot currently be established from sufficient achieved-sale evidence. Overpayment exposure is therefore unquantified.',
      action: 'Obtain independent market and property-record evidence and review at least 3 verified achieved sales before treating the asking price as market-supported.',
      protection: 'Avoid committing to an unconditional offer until the missing price evidence has been reviewed.',
    });
  }

  if (hasValue(facts.askingPriceCents) && !hasValue(facts.ratesAndTaxesCents)) {
    exposures.push({
      category: 'CASH_FLOW',
      exposure: 'Recurring municipal rates and taxes are not verified, so the true monthly ownership cost is incomplete.',
      action: 'Request the latest municipal account and confirm current charges, arrears and transfer-related amounts with the relevant parties.',
      protection: 'Include verification of material recurring property costs in the buyer due-diligence process before the transaction becomes unconditional.',
    });
  }

  if (hasValue(facts.askingPriceCents) && !hasValue(facts.leviesCents)) {
    exposures.push({
      category: 'CASH_FLOW',
      exposure: 'Levies are not verified. If this is a sectional-title or levy-bearing property, the monthly budget may be understated.',
      action: 'Request the latest levy statement and confirm special levies, arrears and applicable body-corporate or HOA charges.',
      protection: 'Do not treat the displayed monthly ownership cost as complete until recurring charges are verified.',
    });
  }

  if (!hasValue(facts.floorSizeM2) || !hasValue(facts.landSizeM2)) {
    exposures.push({
      category: 'PROPERTY',
      exposure: 'A material property dimension is not verified, which can affect comparable selection, price-per-m² analysis and due diligence.',
      action: 'Confirm the relevant floor/land dimensions against source documents and the physical property.',
      protection: 'Require document and physical verification before relying on size-based comparisons.',
    });
  }

  exposures.push({
    category: 'DOCUMENTS',
    exposure: 'Listing evidence does not by itself verify approved building plans, compliance certificates, title conditions, zoning or heritage status.',
    action: 'Request the applicable plans, certificates and property-record evidence and have discrepancies reviewed by the appropriate professional.',
    protection: 'Suggested transaction protection for legal review: make material document verification a suspensive due-diligence item before an unconditional commitment.',
  });

  return exposures;
}

export function riskExposuresToLimitations(exposures: RiskExposure[]): string[] {
  return exposures.flatMap((item) => [
    `Risk exposure — ${item.category}: ${item.exposure}`,
    `Buyer action: ${item.action}`,
    `Transaction protection: ${item.protection}`,
  ]);
}
