import { EXTRACTION_CORPUS } from '@/tests/fixtures/extraction-corpus';
import { EXPECTED_CORE_FACTS } from '@/tests/fixtures/extraction-expected-facts';
import { extractListingId, identifySource, runSecureExtraction } from '@/lib/secure-extraction-engine';

const failures: string[] = [];

for (const item of EXTRACTION_CORPUS) {
  const url = new URL(item.url);
  const source = identifySource(url)?.source;
  const listingId = source ? extractListingId(source, url) : null;

  if (source !== item.expectedSource) {
    failures.push(`${item.name}: source expected ${item.expectedSource}, got ${source ?? 'none'}`);
    continue;
  }

  if (listingId !== item.expectedListingId) {
    failures.push(`${item.name}: listing ID expected ${item.expectedListingId}, got ${listingId ?? 'none'}`);
    continue;
  }

  try {
    const result = await runSecureExtraction(item.url);
    const facts = result.facts;
    const identity = result.metadata?.listingId;

    if (identity !== item.expectedListingId) {
      failures.push(`${item.name}: extracted identity expected ${item.expectedListingId}, got ${identity ?? 'none'}`);
      continue;
    }

    if (result.status === 'extracted' && result.metadata?.reportEligible === false) {
      failures.push(`${item.name}: extracted result incorrectly marked report-ineligible`);
    }

    if (result.status === 'extracted' && (!facts.title || !facts.propertyType || facts.askingPriceCents === null)) {
      failures.push(`${item.name}: extracted result is missing core commercial/property identity facts`);
    }

    const expected = EXPECTED_CORE_FACTS[item.name];
    if (result.status === 'extracted' && expected) {
      if (expected.titleContains && !facts.title?.toLowerCase().includes(expected.titleContains.toLowerCase())) {
        failures.push(`${item.name}: title mismatch; expected to contain ${JSON.stringify(expected.titleContains)}, got ${JSON.stringify(facts.title)}`);
      }
      if (expected.propertyType && facts.propertyType !== expected.propertyType) {
        failures.push(`${item.name}: property type expected ${expected.propertyType}, got ${facts.propertyType ?? 'null'}`);
      }
      if (expected.askingPriceCents !== undefined && facts.askingPriceCents !== expected.askingPriceCents) {
        failures.push(`${item.name}: asking price expected ${expected.askingPriceCents}, got ${facts.askingPriceCents ?? 'null'}`);
      }
      if (expected.bedrooms !== undefined && facts.bedrooms !== expected.bedrooms) {
        failures.push(`${item.name}: bedrooms expected ${expected.bedrooms}, got ${facts.bedrooms ?? 'null'}`);
      }
      if (expected.bathrooms !== undefined && facts.bathrooms !== expected.bathrooms) {
        failures.push(`${item.name}: bathrooms expected ${expected.bathrooms}, got ${facts.bathrooms ?? 'null'}`);
      }
      if (expected.landSizeM2 !== undefined && facts.landSizeM2 !== expected.landSizeM2) {
        failures.push(`${item.name}: land size expected ${expected.landSizeM2}, got ${facts.landSizeM2 ?? 'null'}`);
      }
      if (expected.floorSizeM2 !== undefined && facts.floorSizeM2 !== expected.floorSizeM2) {
        failures.push(`${item.name}: floor size expected ${expected.floorSizeM2}, got ${facts.floorSizeM2 ?? 'null'}`);
      }
    }

    console.log(JSON.stringify({
      name: item.name,
      source,
      listingId: identity,
      status: result.status,
      reportEligible: result.metadata?.reportEligible ?? false,
      evidenceCompleteness: result.metadata?.evidenceCompleteness ?? 0,
      conflicts: result.metadata?.conflicts.length ?? 0,
      title: facts.title,
      propertyType: facts.propertyType,
      askingPriceCents: facts.askingPriceCents,
      bedrooms: facts.bedrooms,
      bathrooms: facts.bathrooms,
      landSizeM2: facts.landSizeM2,
      floorSizeM2: facts.floorSizeM2,
    }));
  } catch (error) {
    failures.push(`${item.name}: runner failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error('\nEXTRACTION CORPUS FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nEXTRACTION CORPUS PASSED: ${EXTRACTION_CORPUS.length}/${EXTRACTION_CORPUS.length}`);
}
