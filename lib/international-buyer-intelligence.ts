import type { AcquisitionIntelligence } from "@/lib/acquisition-intelligence";
import type { MarketIntelligence } from "@/lib/market-intelligence";
import type { PropertyEvidence, PropertyFacts } from "@/lib/property-types";

export interface InternationalBuyerProfile {
  buyerType: "south_african" | "international";
  buyerCountry: string | null;
  buyerPurpose: string | null;
  buyerBudget: string | null;
}

export interface InternationalBuyerIntelligence {
  profile: InternationalBuyerProfile;

  propertySnapshot: {
    location: string | null;
    propertyType: string | null;
    askingPriceCents: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floorSizeM2: number | null;
    landSizeM2: number | null;
  };

  marketPosition: MarketIntelligence["marketPosition"];
  subjectVsComparableMedianPercent: number | null;

  acquisitionSnapshot: {
    purchasePriceCents: number | null;
    depositPercent: number;
    depositCents: number | null;
    transferDutyCents: number | null;
    knownUpfrontCashRequiredCents: number | null;
    bondMonthlyPaymentCents: number | null;
  };

  lifestyleIndicators: {
    fibre: boolean | null;
    solar: boolean | null;
    batteryBackup: boolean | null;
    pool: boolean | null;
    garden: boolean | null;
    parking: number | null;
  };

  evidenceGaps: string[];
  dueDiligenceQuestions: string[];
  assumptions: string[];
  limitations: string[];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildEvidenceGaps(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
): string[] {
  const gaps: string[] = [];

  const importantFields: Array<keyof PropertyFacts> = [
    "address",
    "askingPriceCents",
    "propertyType",
    "floorSizeM2",
    "bedrooms",
    "bathrooms",
  ];

  for (const field of importantFields) {
    if (
      facts[field] === null ||
      facts[field] === undefined ||
      facts[field] === ""
    ) {
      gaps.push(
        `No verified ${field} was available from the supplied listing.`,
      );
    }
  }

  const infrastructureFields: Array<keyof PropertyFacts> = [
    "hasFibre",
    "hasSolar",
    "hasBatteryBackup",
    "hasPool",
    "hasGarden",
    "parking",
  ];

  for (const field of infrastructureFields) {
    if (!evidence.some((item) => item.field === field)) {
      gaps.push(`No source evidence was found for ${field}.`);
    }
  }

  return unique(gaps);
}

function buildDueDiligenceQuestions(
  facts: PropertyFacts,
  acquisition: AcquisitionIntelligence,
): string[] {
  const questions: string[] = [
    "Confirm ownership, title deed status and any registered restrictions or servitudes with the conveyancing attorney.",
    "Confirm whether the transaction is subject to VAT or transfer duty before relying on the acquisition estimate.",
    "Obtain verified conveyancing, bond-registration and lender-cost estimates before determining total acquisition cash requirements.",
  ];

  if (facts.leviesCents === null) {
    questions.push(
      "Obtain the latest levy statement and confirm any special levies or planned capital expenditure.",
    );
  }

  if (facts.ratesAndTaxesCents === null) {
    questions.push(
      "Obtain the latest municipal rates and taxes statement.",
    );
  }

  if (
    facts.hasSolar === null ||
    facts.hasBatteryBackup === null
  ) {
    questions.push(
      "Confirm the property energy-resilience setup, including solar, battery backup, ownership and maintenance obligations.",
    );
  }

  if (facts.hasFibre === null) {
    questions.push(
      "Confirm available fibre/internet infrastructure and the actual serviceability at the property.",
    );
  }

  if (acquisition.transferDutyCents !== null) {
    questions.push(
      "Have the acquisition-cost assumptions reviewed by the conveyancer before making an offer.",
    );
  }

  questions.push(
    "For an international purchaser, obtain independent South African legal, tax and immigration advice applicable to the buyer's circumstances.",
  );

  return unique(questions);
}

export function calculateInternationalBuyerIntelligence(input: {
  profile: InternationalBuyerProfile;
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  market: MarketIntelligence;
  acquisition: AcquisitionIntelligence;
}): InternationalBuyerIntelligence {
  const {
    profile,
    facts,
    evidence,
    market,
    acquisition,
  } = input;

  const assumptions = unique([
    ...acquisition.assumptions,
    "International buyer suitability is not a legal, tax, immigration or formal valuation opinion.",
    "No live foreign-exchange conversion is performed because no verified FX rate is supplied to the report engine.",
  ]);

  const limitations = unique([
    ...acquisition.unknownCosts,
    "Foreign-exchange exposure is not quantified without a verified exchange-rate source.",
    "South African residency, immigration and visa eligibility are not determined by EiXPropScore™.",
    "Foreign buyer tax obligations outside South Africa are not assessed.",
    "Legal ownership, title, zoning, municipal compliance and transaction documentation require independent professional verification.",
  ]);

  return {
    profile,

    propertySnapshot: {
      location:
        facts.address ||
        [facts.suburb, facts.city, facts.province]
          .filter(Boolean)
          .join(", ") ||
        null,
      propertyType: facts.propertyType,
      askingPriceCents: facts.askingPriceCents,
      bedrooms: facts.bedrooms,
      bathrooms: facts.bathrooms,
      floorSizeM2: facts.floorSizeM2,
      landSizeM2: facts.landSizeM2,
    },

    marketPosition: market.marketPosition,
    subjectVsComparableMedianPercent:
      market.subjectVsMedianPercent,

    acquisitionSnapshot: {
      purchasePriceCents: acquisition.purchasePriceCents,
      depositPercent: acquisition.depositPercent,
      depositCents: acquisition.depositCents,
      transferDutyCents: acquisition.transferDutyCents,
      knownUpfrontCashRequiredCents:
        acquisition.knownUpfrontCashRequiredCents,
      bondMonthlyPaymentCents:
        acquisition.bondMonthlyPaymentCents,
    },

    lifestyleIndicators: {
      fibre: facts.hasFibre,
      solar: facts.hasSolar,
      batteryBackup: facts.hasBatteryBackup,
      pool: facts.hasPool,
      garden: facts.hasGarden,
      parking: facts.parking,
    },

    evidenceGaps: buildEvidenceGaps(facts, evidence),

    dueDiligenceQuestions:
      buildDueDiligenceQuestions(
        facts,
        acquisition,
      ),

    assumptions,
    limitations,
  };
}