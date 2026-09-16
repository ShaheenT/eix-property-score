import { extractPropertyFromUrl } from '@/lib/secure-property-extractor';
import { selectProperty24Comparables, type ComparableProperty } from '@/lib/property24-comparables';
import type { PropertyFacts } from '@/lib/property-types';

const MAX_CANDIDATES = 6;
const MAX_COMPARABLES = 3;
const FETCH_TIMEOUT_MS = 8_000;

function property24Host(url: URL): boolean {
  return url.hostname === 'property24.com' || url.hostname === 'www.property24.com' || url.hostname.endsWith('.property24.com');
}

function buildSearchUrls(subjectUrl: string): string[] {
  const url = new URL(subjectUrl);
  if (!property24Host(url)) return [];

  const segments = url.pathname.split('/').filter(Boolean).map((value) => decodeURIComponent(value));
  const forSaleIndex = segments.findIndex((value) => value.toLowerCase() === 'for-sale');
  if (forSaleIndex < 0) return [];

  const estate = segments[forSaleIndex + 1];
  const city = segments[forSaleIndex + 2];
  const province = segments[forSaleIndex + 3];
  const areaId = segments[forSaleIndex + 4];
  if (!estate || !city || !province || !areaId) return [];

  const urls = [
    new URL(`/houses-for-sale/${encodeURIComponent(estate)}/${encodeURIComponent(city)}/${encodeURIComponent(province)}/${encodeURIComponent(areaId)}`, url.origin).toString(),
    new URL(`/houses-for-sale/${encodeURIComponent(city)}/${encodeURIComponent(province)}`, url.origin).toString(),
  ];

  return [...new Set(urls)];
}

async function fetchSearchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9',
        'User-Agent': 'EiXPropScore/2.0 (+https://eix-property-score-beta.vercel.app)',
      },
    });

    if (!response.ok) return null;
    const finalUrl = new URL(response.url || url);
    if (!property24Host(finalUrl)) return null;
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function discoverListingUrls(body: string, subjectUrl: string): string[] {
  const subject = new URL(subjectUrl);
  const matches = body.match(/\/for-sale\/[^"'<>\s]+\/\d+\/\d+\/?/gi) ?? [];
  const urls = matches.map((path) => new URL(path, subject.origin).toString());
  return [...new Set(urls)].filter((url) => url !== subjectUrl).slice(0, MAX_CANDIDATES);
}

function similarity(subject: PropertyFacts, candidate: PropertyFacts): number {
  let score = 0;
  let weight = 0;

  const compareNumber = (a: number | null, b: number | null, fieldWeight: number) => {
    if (a === null || b === null) return;
    weight += fieldWeight;
    const difference = Math.abs(a - b) / Math.max(Math.abs(a), 1);
    score += Math.max(0, 1 - Math.min(difference, 1)) * fieldWeight;
  };

  if (subject.propertyType && candidate.propertyType) {
    weight += 3;
    score += subject.propertyType === candidate.propertyType ? 3 : 0;
  }
  compareNumber(subject.bedrooms, candidate.bedrooms, 3);
  compareNumber(subject.bathrooms, candidate.bathrooms, 2);
  compareNumber(subject.floorSizeM2, candidate.floorSizeM2, 3);
  compareNumber(subject.landSizeM2, candidate.landSizeM2, 2);

  return weight === 0 ? 0 : score / weight;
}

export async function discoverProperty24Comparables(subjectUrl: string, subject: PropertyFacts): Promise<ComparableProperty[]> {
  const searchUrls = buildSearchUrls(subjectUrl);
  if (searchUrls.length === 0) return [];

  let listingUrls: string[] = [];
  for (const searchUrl of searchUrls) {
    const body = await fetchSearchPage(searchUrl);
    if (!body) continue;
    listingUrls = [...new Set([...listingUrls, ...discoverListingUrls(body, subjectUrl)])];
    if (listingUrls.length >= MAX_CANDIDATES) break;
  }

  if (listingUrls.length === 0) return [];

  const extracted = await Promise.all(
    listingUrls.slice(0, MAX_CANDIDATES).map(async (sourceUrl) => {
      try {
        const result = await extractPropertyFromUrl(sourceUrl);
        if (result.status !== 'extracted' || result.metadata?.reportEligible === false) return null;
        return {
          listingId: result.metadata?.listingId ?? null,
          sourceUrl,
          facts: result.facts,
          evidence: result.evidence,
          similarity: similarity(subject, result.facts),
        } satisfies ComparableProperty;
      } catch {
        return null;
      }
    }),
  );

  return selectProperty24Comparables(
    subject,
    extracted.filter((value): value is ComparableProperty => value !== null),
    { subjectListingId: subjectUrl.match(/\/(\d+)\/?$/)?.[1] ?? null, maxResults: MAX_COMPARABLES },
  );
}
