import { extractPropertyFromUrl as legacyExtractPropertyFromUrl } from '@/lib/property-extractor';
import { runSecureExtraction } from '@/lib/secure-extraction-engine';

export async function extractPropertyFromUrl(input: string) {
  return runSecureExtraction(input, { legacyExtract: legacyExtractPropertyFromUrl });
}
