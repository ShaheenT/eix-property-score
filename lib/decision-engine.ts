import type { PropertyFacts } from '@/lib/property-types';
import type { MarketIntelligence } from '@/lib/market-intelligence';
import type { AcquisitionIntelligence } from '@/lib/acquisition-intelligence';

export type DecisionGoal = 'buy_to_live' | 'rental' | 'flip';

export type Decision =
  | 'BUY'
  | 'NEGOTIATE'
  | 'INVESTIGATE'
  | 'PASS'
  | 'INSUFFICIENT_DATA';

export interface DecisionConstraints {
  maxKnownUpfrontCashCents?: number;
  maxMonthlyPropertyCostCents?: number;
  minimumBedrooms?: number;
  minimumBathrooms?: number;
}

export interface DecisionResult {
  goal: DecisionGoal;
  decision: Decision;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  verifiedFactsUsed: string[];
  assumptionsUsed: string[];
  unknowns: string[];
}

function addUnique(items: string[], value: string): void {
  if (!items.includes(value)) {
    items.push(value);
  }
}

function hasAffordabilityConstraint(
  constraints: DecisionConstraints | undefined,
): boolean {
  return (
    constraints?.maxKnownUpfrontCashCents !== undefined ||
    constraints?.maxMonthlyPropertyCostCents !== undefined
  );
}

function evaluatePropertyRequirements(
  facts: PropertyFacts,
  constraints: DecisionConstraints | undefined,
  reasons: string[],
  verifiedFactsUsed: string[],
): Decision | null {
  if (constraints?.minimumBedrooms !== undefined) {
    if (facts.bedrooms === null) {
      addUnique(
        verifiedFactsUsed,
        'Bedrooms are required for the supplied minimum-bedroom constraint.',
      );
      return 'INSUFFICIENT_DATA';
    }

    addUnique(verifiedFactsUsed, `Verified bedrooms: ${facts.bedrooms}.`);

    if (facts.bedrooms < constraints.minimumBedrooms) {
      reasons.push(
        `Property has ${facts.bedrooms} bedrooms, below the required minimum of ${constraints.minimumBedrooms}.`,
      );
      return 'PASS';
    }
  }

  if (constraints?.minimumBathrooms !== undefined) {
    if (facts.bathrooms === null) {
      addUnique(
        verifiedFactsUsed,
        'Bathrooms are required for the supplied minimum-bathroom constraint.',
      );
      return 'INSUFFICIENT_DATA';
    }

    addUnique(verifiedFactsUsed, `Verified bathrooms: ${facts.bathrooms}.`);

    if (facts.bathrooms < constraints.minimumBathrooms) {
      reasons.push(
        `Property has ${facts.bathrooms} bathrooms, below the required minimum of ${constraints.minimumBathrooms}.`,
      );
      return 'PASS';
    }
  }

  return null;
}

function evaluateAffordability(
  acquisition: AcquisitionIntelligence,
  constraints: DecisionConstraints | undefined,
  reasons: string[],
  assumptionsUsed: string[],
  unknowns: string[],
): Decision | null {
  if (!constraints) {
    unknowns.push(
      'No buyer affordability constraints were supplied, so affordability cannot be verified.',
    );
    return null;
  }

  if (constraints.maxKnownUpfrontCashCents !== undefined) {
    if (acquisition.knownUpfrontCashRequiredCents === null) {
      unknowns.push(
        'Known upfront cash requirement cannot be calculated because purchase price is unavailable.',
      );
      return 'INSUFFICIENT_DATA';
    }

    if (
      acquisition.knownUpfrontCashRequiredCents >
      constraints.maxKnownUpfrontCashCents
    ) {
      reasons.push(
        'Known upfront cash requirement exceeds the supplied maximum upfront cash constraint.',
      );
      return 'PASS';
    }
  }

  if (constraints.maxMonthlyPropertyCostCents !== undefined) {
    if (acquisition.bondMonthlyPaymentCents === null) {
      unknowns.push(
        'Monthly bond payment cannot be calculated because the purchase price is unavailable.',
      );
      return 'INSUFFICIENT_DATA';
    }

    const recurring =
      acquisition.verifiedRecurringMonthlyCostsCents ?? 0;

    const monthlyKnownCost =
      acquisition.bondMonthlyPaymentCents + recurring;

    if (monthlyKnownCost > constraints.maxMonthlyPropertyCostCents) {
      reasons.push(
        'Known monthly property cost exceeds the supplied maximum monthly property-cost constraint.',
      );
      return 'PASS';
    }

    assumptionsUsed.push(
      'Monthly property-cost test uses the acquisition engine loan and interest-rate scenario.',
    );
  }

  return null;
}

export function evaluateDecision(
  goal: DecisionGoal,
  facts: PropertyFacts,
  market: MarketIntelligence,
  acquisition: AcquisitionIntelligence,
  constraints?: DecisionConstraints,
): DecisionResult {
  const reasons: string[] = [];
  const verifiedFactsUsed: string[] = [];
  const assumptionsUsed: string[] = [];
  const unknowns: string[] = [];

  if (facts.askingPriceCents === null) {
    return {
      goal,
      decision: 'INSUFFICIENT_DATA',
      confidence: 'high',
      reasons: ['Verified asking price is unavailable.'],
      verifiedFactsUsed: [],
      assumptionsUsed: [],
      unknowns: [
        'Purchase price is required before acquisition and market decisions can be made.',
      ],
    };
  }

  verifiedFactsUsed.push(
    `Verified asking price: ${facts.askingPriceCents} cents.`,
  );

  if (goal === 'rental') {
    return {
      goal,
      decision: 'INSUFFICIENT_DATA',
      confidence: 'high',
      reasons: [
        'Rental decision cannot be established from the current verified property facts.',
        'No verified rental income or market rent is available.',
      ],
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns: [
        'Verified rental income is unavailable.',
        'Rental operating expenses beyond verified property costs are unavailable.',
        'Rental yield and cash-flow cannot therefore be calculated reliably.',
      ],
    };
  }

  if (goal === 'flip') {
    return {
      goal,
      decision: 'INSUFFICIENT_DATA',
      confidence: 'high',
      reasons: [
        'Flip decision cannot be established from the current evidence.',
        'There is no verified renovation budget or sufficiently reliable exit-value basis.',
      ],
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns: [
        'Renovation and improvement costs are unknown.',
        'Exit value is not established by a verified valuation.',
        'Holding, selling and transaction costs are not fully verified.',
      ],
    };
  }

  const requirementDecision = evaluatePropertyRequirements(
    facts,
    constraints,
    reasons,
    verifiedFactsUsed,
  );

  if (requirementDecision !== null) {
    return {
      goal,
      decision: requirementDecision,
      confidence: 'high',
      reasons,
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns,
    };
  }

  const affordabilityDecision = evaluateAffordability(
    acquisition,
    constraints,
    reasons,
    assumptionsUsed,
    unknowns,
  );

  if (affordabilityDecision === 'PASS') {
    return {
      goal,
      decision: 'PASS',
      confidence: 'high',
      reasons,
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns,
    };
  }

  if (affordabilityDecision === 'INSUFFICIENT_DATA') {
    return {
      goal,
      decision: 'INSUFFICIENT_DATA',
      confidence: 'high',
      reasons,
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns,
    };
  }

  if (market.subjectVsMedianPercent === null) {
    unknowns.push(
      'Price fairness cannot be established because at least 3 verified achieved-sale comparables are required; active asking prices are context only.',
    );

    return {
      goal,
      decision: 'INVESTIGATE',
      confidence: 'medium',
      reasons: [
        'The asking price is known, but the available evidence does not yet establish what comparable properties actually achieved in the market.',
      ],
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns,
    };
  }

  verifiedFactsUsed.push(
    `Subject position versus achieved-sale median: ${market.subjectVsMedianPercent.toFixed(2)}%.`,
  );

  const achievedSalePosition =
    market.subjectVsMedianPercent < -0.5
      ? 'Below Comparable Median'
      : market.subjectVsMedianPercent > 0.5
        ? 'Above Comparable Median'
        : 'At Comparable Median';

  if (achievedSalePosition === 'Below Comparable Median') {
    reasons.push(
      'The subject asking price is below the verified achieved-sale median.',
    );
    reasons.push(
      'Active asking-price comparisons are not a valuation and should support negotiation rather than establish intrinsic value.',
    );

    if (hasAffordabilityConstraint(constraints)) {
      reasons.push(
        'The supplied affordability constraint passes under the acquisition scenario.',
      );

      return {
        goal,
        decision: 'BUY',
        confidence: 'medium',
        reasons,
        verifiedFactsUsed,
        assumptionsUsed,
        unknowns,
      };
    }

    return {
      goal,
      decision: 'NEGOTIATE',
      confidence: 'medium',
      reasons,
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns,
    };
  }

  if (achievedSalePosition === 'Above Comparable Median') {
    reasons.push(
      'The subject asking price is above the verified achieved-sale median.',
    );
    reasons.push(
      'The premium requires investigation before proceeding because the current evidence does not establish a corresponding valuation.',
    );

    return {
      goal,
      decision: 'INVESTIGATE',
      confidence: 'medium',
      reasons,
      verifiedFactsUsed,
      assumptionsUsed,
      unknowns,
    };
  }

  reasons.push(
    'The subject asking price is approximately aligned with the verified achieved-sale median.',
  );

  if (!hasAffordabilityConstraint(constraints)) {
    reasons.push(
      'Affordability has not been verified without an explicit buyer affordability constraint.',
    );
    unknowns.push(
      'Buyer affordability has not been independently established.',
    );
  }

  return {
    goal,
    decision: 'INVESTIGATE',
    confidence: 'medium',
    reasons,
    verifiedFactsUsed,
    assumptionsUsed,
    unknowns,
  };
}
