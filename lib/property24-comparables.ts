import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

/**
 * A comparable is deliberately separate from PropertyFacts.
 * PropertyFacts describes one listing; this contract describes a candidate
 * comparison listing and its provenance.
 */
export interface ComparableProperty {
  listingId: string | null;
  sourceUrl: string;
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  similarity: number | null;
  /**
   * Market evidence provenance. Active listings are context only.
   * Price-fairness analysis requires at least 3 registered achieved sales.
   */
  saleStatus?: 'registered_sale' | 'pending_sale' | 'active_listing';
}

export interface ComparableSelectionOptions {
  subjectListingId?: string | null;
  maxResults?: number;
}

/**
 * Filters an already-extracted comparable set without inventing data.
 * Discovery/fetching belongs to a future Property24 adapter; this module
 * intentionally contains only deterministic comparison rules.
 */
export function selectProperty24Comparables(
  subject: PropertyFacts,
  candidates: ComparableProperty[],
  options: ComparableSelectionOptions = {},
): ComparableProperty[] {
  const subjectId = options.subjectListingId ?? null;
  const maxResults = options.maxResults ?? candidates.length;

  return candidates
    .filter((candidate) => candidate.sourceUrl.length > 0)
    .filter((candidate) => !(subjectId && candidate.listingId === subjectId))
    .filter((candidate) => candidate.facts.askingPriceCents !== null)
    .filter((candidate) => candidate.facts.floorSizeM2 !== null)
    .filter((candidate) => candidate.facts.propertyType === null || candidate.facts.propertyType === subject.propertyType)
    .sort((a, b) => {
      const aSimilarity = a.similarity ?? -Infinity;
      const bSimilarity = b.similarity ?? -Infinity;
      return bSimilarity - aSimilarity;
    })
    .slice(0, Math.max(0, maxResults));
}

export function extractProperty24ListingId(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    if (!/property24\.com$/i.test(url.hostname) && !/\.property24\.com$/i.test(url.hostname)) {
      return null;
    }

    const match = url.pathname.match(/(\d{6,})/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
