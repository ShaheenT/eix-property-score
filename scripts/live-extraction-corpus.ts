import { EXTRACTION_CORPUS } from '@/tests/fixtures/extraction-corpus';
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
