import type { PropertyFacts } from '@/lib/property-types';

export interface AcquisitionIntelligence {
  purchasePriceCents: number | null;
  depositPercent: number;
  depositCents: number | null;
  loanToValuePercent: number;
  loanAmountCents: number | null;
  transferDutyCents: number | null;
  transferDutySchedule: 'SARS_2026_2027';
  transferDutyBasis: 'purchase_price_assumption';
  bondAnnualInterestPercent: number;
  bondTermYears: number;
  bondMonthlyPaymentCents: number | null;
  verifiedRecurringMonthlyCostsCents: number | null;
  verifiedRecurringMonthlyCosts: {
    leviesCents: number | null;
    ratesAndTaxesCents: number | null;
  };
  knownUpfrontCashRequiredCents: number | null;
  assumptions: string[];
  unknownCosts: string[];
}

const DEFAULT_DEPOSIT_PERCENT = 10;
const DEFAULT_BOND_INTEREST_PERCENT = 10.5;
const DEFAULT_BOND_TERM_YEARS = 20;

function calculateTransferDutyCents(purchasePriceCents: number): number {
  const priceCents = Math.max(0, Math.round(purchasePriceCents));

  const thresholds = [
    { upperCents: 1_210_000 * 100, baseCents: 0, rate: 0, lowerCents: 0 },
    { upperCents: 1_663_800 * 100, baseCents: 0, rate: 0.03, lowerCents: 1_210_000 * 100 },
    { upperCents: 2_329_300 * 100, baseCents: 13_614 * 100, rate: 0.06, lowerCents: 1_663_800 * 100 },
    { upperCents: 2_994_800 * 100, baseCents: 53_544 * 100, rate: 0.08, lowerCents: 2_329_300 * 100 },
    { upperCents: 13_310_000 * 100, baseCents: 106_784 * 100, rate: 0.11, lowerCents: 2_994_800 * 100 },
  ];

  if (priceCents <= thresholds[0].upperCents) return 0;

  for (const bracket of thresholds.slice(1)) {
    if (priceCents <= bracket.upperCents) {
      return Math.round(bracket.baseCents + (priceCents - bracket.lowerCents) * bracket.rate);
    }
  }

  return Math.round(1_241_456 * 100 + (priceCents - 13_310_000 * 100) * 0.13);
}

function calculateBondPaymentCents(
  principalCents: number,
  annualInterestPercent: number,
  termYears: number,
): number {
  const months = termYears * 12;
  const monthlyRate = annualInterestPercent / 100 / 12;

  if (principalCents <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return Math.round(principalCents / months);

  const factor = Math.pow(1 + monthlyRate, months);
  return Math.round(principalCents * ((monthlyRate * factor) / (factor - 1)));
}

export function calculateAcquisitionIntelligence(
  facts: PropertyFacts,
): AcquisitionIntelligence {
  const purchasePriceCents = facts.askingPriceCents;
  const depositPercent = DEFAULT_DEPOSIT_PERCENT;
  const loanToValuePercent = 100 - depositPercent;
  const bondAnnualInterestPercent = DEFAULT_BOND_INTEREST_PERCENT;
  const bondTermYears = DEFAULT_BOND_TERM_YEARS;

  const depositCents =
    purchasePriceCents === null
      ? null
      : Math.round(purchasePriceCents * (depositPercent / 100));

  const loanAmountCents =
    purchasePriceCents === null
      ? null
      : purchasePriceCents - (depositCents ?? 0);

  const transferDutyCents =
    purchasePriceCents === null
      ? null
      : calculateTransferDutyCents(purchasePriceCents);

  const bondMonthlyPaymentCents =
    loanAmountCents === null
      ? null
      : calculateBondPaymentCents(
          loanAmountCents,
          bondAnnualInterestPercent,
          bondTermYears,
        );

  const leviesCents = facts.leviesCents;
  const ratesAndTaxesCents = facts.ratesAndTaxesCents;
  const recurringCosts = [leviesCents, ratesAndTaxesCents].filter(
    (value): value is number => value !== null && value >= 0,
  );

  const verifiedRecurringMonthlyCostsCents =
    recurringCosts.length > 0
      ? recurringCosts.reduce((sum, value) => sum + value, 0)
      : null;

  const knownUpfrontCashRequiredCents =
    depositCents !== null && transferDutyCents !== null
      ? depositCents + transferDutyCents
      : null;

  const assumptions = [
    'Deposit scenario assumes 10% of asking price.',
    'Bond scenario assumes 90% loan-to-value, 11.5% annual interest and a 20-year term.',
    'Transfer duty uses the SARS 2026/2027 schedule effective from 1 April 2026.',
    'Transfer duty is calculated on asking price for scenario planning; the final duty basis must be confirmed for the transaction.',
    'Transfer duty is included only where the transaction is not subject to VAT.',
  ];

  const unknownCosts = [
    'Conveyancing and transfer attorney fees are not included because no verified fee quote is available.',
    'Bond registration costs are not included because no verified fee quote is available.',
    'Bank initiation and other lender charges are not included because no verified fee quote is available.',
    'Moving, inspection, insurance and other transaction-specific costs are not included.',
    'VAT treatment is not verified from the property facts and must be confirmed before relying on transfer-duty assumptions.',
  ];

  return {
    purchasePriceCents,
    depositPercent,
    depositCents,
    loanToValuePercent,
    loanAmountCents,
    transferDutyCents,
    transferDutySchedule: 'SARS_2026_2027',
    transferDutyBasis: 'purchase_price_assumption',
    bondAnnualInterestPercent,
    bondTermYears,
    bondMonthlyPaymentCents,
    verifiedRecurringMonthlyCostsCents,
    verifiedRecurringMonthlyCosts: {
      leviesCents,
      ratesAndTaxesCents,
    },
    knownUpfrontCashRequiredCents,
    assumptions,
    unknownCosts,
  };
}
