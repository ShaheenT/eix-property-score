import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAreaIntelligence } from '@/lib/intelligence/area-engine';
import { buildDealBreakers } from '@/lib/intelligence/dealbreaker-engine';
import { buildInvestmentIntelligence } from '@/lib/intelligence/investment-engine';
import { buildLandIntelligence } from '@/lib/intelligence/land-engine';
import { buildMunicipalIntelligence } from '@/lib/intelligence/municipal-engine';
import { buildRelocationIntelligence } from '@/lib/intelligence/relocation-engine';
import { runIntelligence } from '@/lib/intelligence/orchestrator';

test('area engine does not invent missing location evidence', () => {
  const result = buildAreaIntelligence({});
  assert.equal(result.policeDistanceKm.status, 'unknown');
  assert.equal(result.hospitalDistanceKm.status, 'unknown');
  assert.equal(result.informalSettlementDistanceKm.status, 'unknown');
});

test('area engine calculates proximity scores from supplied evidence', () => {
  const result = buildAreaIntelligence({}, { policeDistanceKm: 2, hospitalDistanceKm: 4, shoppingDistanceKm: 1, pharmacyDistanceKm: 0.5 });
  assert.equal(result.policeDistanceKm.value, 2);
  assert.ok((result.convenienceScore.value ?? 0) > 0);
  assert.equal(result.convenienceScore.status, 'available');
});

test('municipal engine explicitly requires confirmation when approval is unknown', () => {
  const result = buildMunicipalIntelligence({}, {});
  assert.equal(result.buildingPlans.status, 'unknown');
  assert.equal(result.municipalApproval.status, 'unknown');
});

test('land engine scores development readiness only from supplied signals', () => {
  const result = buildLandIntelligence({}, {
    waterConnection: 'connected',
    electricityConnection: 'available',
    sewerConnection: 'available',
    stormwater: 'available',
    zoningVerified: true,
  });
  assert.ok((result.developmentReadiness.value ?? 0) >= 75);
});

test('relocation engine identifies university proximity without claiming rental valuation', () => {
  const result = buildRelocationIntelligence({}, { nearestUniversity: { name: 'Test University', distanceKm: 2 } });
  assert.equal(result.studentRentalPotential.value, 'high');
  assert.match(result.studentRentalPotential.evidence[0]?.notes ?? '', /not a rental valuation/);
});

test('investment engine calculates price per land m2 and refuses unsupported market comparison', () => {
  const result = buildInvestmentIntelligence({ askingPriceCents: 100_000_000, landSizeM2: 500 }, {});
  assert.equal(result.pricePerM2.value, 200_000);
  assert.equal(result.askingPriceSignal.status, 'unknown');
});

test('orchestrator integrates investment and future risk radar', () => {
  const intelligence = runIntelligence({ askingPriceCents: 10_000_000, landSizeM2: 100 }, {
    investment: { comparablePricePerM2: 80_000 },
    futureRisk: { floodRisk: 'high' },
  });
  assert.equal(intelligence.investment.pricePerM2.value, 100_000);
  assert.ok(intelligence.futureRiskRadar.signals.some((signal) => signal.key === 'future.flood'));
});

test('deal breakers surface confirmation items and geographic context', () => {
  const intelligence = runIntelligence({}, {
    area: { informalSettlementDistanceKm: 1.2, hospitalDistanceKm: 9 },
    municipal: {},
    land: {},
  });
  const keys = intelligence.riskSignals.map((signal) => signal.key);
  assert.ok(keys.includes('municipal.buildingPlans'));
  assert.ok(keys.includes('area.informalSettlementDistanceKm'));
  assert.ok(keys.includes('area.hospitalDistanceKm'));
});
