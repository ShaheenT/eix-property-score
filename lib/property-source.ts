export type PropertySource =
  | 'property24'
  | 'private_property'
  | 'facebook'
  | 'agency'
  | 'address_only';

interface DetectionResult {
  source: PropertySource;
  label: string;
  isUrl: boolean;
}

const PATTERNS: { source: PropertySource; label: string; test: RegExp }[] = [
  { source: 'property24', label: 'Property24', test: /property24\.co\.za/i },
  { source: 'private_property', label: 'Private Property', test: /privateproperty\.co\.za/i },
  { source: 'facebook', label: 'Facebook Marketplace', test: /facebook\.com|fb\.me/i },
  { source: 'agency', label: 'Estate Agency', test: /remax|pamgolding|seeff|harcourts|just-property|rawson|knight/i },
];

const URL_TEST = /^https?:\/\//i;

export function detectPropertySource(input: string): DetectionResult {
  const trimmed = input.trim();
  const isUrl = URL_TEST.test(trimmed) || trimmed.includes('www.');

  for (const pattern of PATTERNS) {
    if (pattern.test.test(trimmed)) {
      return { source: pattern.source, label: pattern.label, isUrl: true };
    }
  }

  if (isUrl) {
    return { source: 'agency', label: 'Estate Agency Site', isUrl: true };
  }

  return { source: 'address_only', label: 'Address Only', isUrl: false };
}

export const SUPPORTED_SOURCES = [
  { source: 'property24' as const, label: 'Property24' },
  { source: 'private_property' as const, label: 'Private Property' },
  { source: 'facebook' as const, label: 'Facebook' },
  { source: 'agency' as const, label: 'Estate Agency Sites' },
  { source: 'address_only' as const, label: 'Address Only' },
];
