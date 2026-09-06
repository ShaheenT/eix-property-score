export type PropertyInputKind = 'url' | 'address';

export type PropertySource =
  | 'property24'
  | 'private_property'
  | 'facebook'
  | 'agency'
  | 'address_only';

export type PropertyInputErrorCode =
  | 'EMPTY_INPUT'
  | 'INPUT_TOO_LONG'
  | 'INVALID_URL'
  | 'UNSUPPORTED_URL'
  | 'INVALID_ADDRESS';

export interface PropertyInputResult {
  ok: boolean;
  kind: PropertyInputKind | null;
  normalizedInput: string;
  source: PropertySource | null;
  sourceLabel: string | null;
  errorCode?: PropertyInputErrorCode;
  errorMessage?: string;
}

const MAX_INPUT_LENGTH = 500;

const EXACT_HOSTS: Record<string, PropertySource> = {
  'property24.com': 'property24',
  'www.property24.com': 'property24',
  'privateproperty.co.za': 'private_property',
  'www.privateproperty.co.za': 'private_property',
  'facebook.com': 'facebook',
  'www.facebook.com': 'facebook',
  'fb.me': 'facebook',
};

const AGENCY_HOST_PATTERNS: Array<[RegExp, string]> = [
  [/^remax\./i, 'RE/MAX'],
  [/^www\.remax\./i, 'RE/MAX'],
  [/^pamgolding\./i, 'Pam Golding'],
  [/^www\.pamgolding\./i, 'Pam Golding'],
  [/^seeff\./i, 'Seeff'],
  [/^www\.seeff\./i, 'Seeff'],
  [/^harcourts\./i, 'Harcourts'],
  [/^www\.harcourts\./i, 'Harcourts'],
  [/^rawson\./i, 'Rawson'],
  [/^www\.rawson\./i, 'Rawson'],
  [/^just-property\./i, 'Just Property'],
  [/^www\.just-property\./i, 'Just Property'],
  [/^knightfrank\./i, 'Knight Frank'],
  [/^www\.knightfrank\./i, 'Knight Frank'],
  [/^century21\./i, 'Century 21'],
  [/^www\.century21\./i, 'Century 21'],
];

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );

  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);

  if (octets.some((octet) => octet > 255)) return true;

  const [a, b] = octets;

  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function isLikelyAddress(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length < 8 || normalized.length > 250) return false;

  if (/^https?:\/\//i.test(normalized)) return false;
  if (/^www\./i.test(normalized)) return false;

  // Require at least one digit and a meaningful alphabetic component.
  if (!/\d/.test(normalized)) return false;
  if (!/[a-zA-ZÀ-ÿ]/.test(normalized)) return false;

  // Reject obvious non-address payloads.
  if (
    /<script|javascript:|data:|vbscript:|onerror\s*=|onload\s*=/i.test(
      normalized
    )
  ) {
    return false;
  }

  // A practical Cape Town/South African address shape:
  // number + street/property name, optionally suburb/city/postcode.
  return /^\d{1,6}\s+[a-zA-ZÀ-ÿ0-9][a-zA-ZÀ-ÿ0-9\s.'’\-/,#()]{2,}$/.test(
    normalized
  );
}

function detectAgency(hostname: string): {
  source: PropertySource;
  label: string;
} | null {
  for (const [pattern, label] of AGENCY_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        source: 'agency',
        label,
      };
    }
  }

  return null;
}

export function validatePropertyInput(input: unknown): PropertyInputResult {
  if (typeof input !== 'string') {
    return {
      ok: false,
      kind: null,
      normalizedInput: '',
      source: null,
      sourceLabel: null,
      errorCode: 'INVALID_ADDRESS',
      errorMessage: 'Enter a property listing URL or street address.',
    };
  }

  const normalizedInput = input.replace(/\s+/g, ' ').trim();

  if (!normalizedInput) {
    return {
      ok: false,
      kind: null,
      normalizedInput: '',
      source: null,
      sourceLabel: null,
      errorCode: 'EMPTY_INPUT',
      errorMessage: 'Enter a property listing URL or street address.',
    };
  }

  if (normalizedInput.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      kind: null,
      normalizedInput: normalizedInput.slice(0, MAX_INPUT_LENGTH),
      source: null,
      sourceLabel: null,
      errorCode: 'INPUT_TOO_LONG',
      errorMessage: `Property input must be ${MAX_INPUT_LENGTH} characters or fewer.`,
    };
  }

  const looksLikeUrl =
    /^https?:\/\//i.test(normalizedInput) ||
    /^www\./i.test(normalizedInput);

  if (looksLikeUrl) {
    // Reject characters that should never appear unescaped in a submitted URL.
    // URL() is intentionally permissive and may silently normalise some malformed
    // inputs, so validate the raw user input before parsing it.
    if (
      normalizedInput.includes('[') ||
      normalizedInput.includes(']') ||
      normalizedInput.includes('<') ||
      normalizedInput.includes('>') ||
      normalizedInput.includes('"') ||
      normalizedInput.includes('{') ||
      normalizedInput.includes('}') ||
      normalizedInput.includes('|') ||
      normalizedInput.includes('\\') ||
      normalizedInput.includes('^') ||
      normalizedInput.includes('`')
    ) {
      return {
        ok: false,
        kind: 'url',
        normalizedInput,
        source: null,
        sourceLabel: null,
        errorCode: 'INVALID_URL',
        errorMessage: 'That does not appear to be a valid property listing URL.',
      };
    }

    let url: URL;

    try {
      const candidate = /^www\./i.test(normalizedInput)
        ? `https://${normalizedInput}`
        : normalizedInput;

      url = new URL(candidate);
    } catch {
      return {
        ok: false,
        kind: 'url',
        normalizedInput,
        source: null,
        sourceLabel: null,
        errorCode: 'INVALID_URL',
        errorMessage: 'That does not appear to be a valid property listing URL.',
      };
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        ok: false,
        kind: 'url',
        normalizedInput,
        source: null,
        sourceLabel: null,
        errorCode: 'INVALID_URL',
        errorMessage: 'Only HTTP and HTTPS property listing URLs are supported.',
      };
    }

    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');

    if (isPrivateOrLocalHostname(hostname)) {
      return {
        ok: false,
        kind: 'url',
        normalizedInput,
        source: null,
        sourceLabel: null,
        errorCode: 'INVALID_URL',
        errorMessage: 'Private or local network URLs are not supported.',
      };
    }

    const exactSource = EXACT_HOSTS[hostname];

    if (exactSource) {
      const labels: Record<PropertySource, string> = {
        property24: 'Property24',
        private_property: 'Private Property',
        facebook: 'Facebook Marketplace',
        agency: 'Estate Agency',
        address_only: 'Address Only',
      };

      return {
        ok: true,
        kind: 'url',
        normalizedInput: url.toString(),
        source: exactSource,
        sourceLabel: labels[exactSource],
      };
    }

    const agency = detectAgency(hostname);

    if (agency) {
      return {
        ok: true,
        kind: 'url',
        normalizedInput: url.toString(),
        source: agency.source,
        sourceLabel: agency.label,
      };
    }

    return {
      ok: false,
      kind: 'url',
      normalizedInput: url.toString(),
      source: null,
      sourceLabel: null,
      errorCode: 'UNSUPPORTED_URL',
      errorMessage:
        'We do not currently support that property website. Try a supported listing URL or enter the property address instead.',
    };
  }

  if (isLikelyAddress(normalizedInput)) {
    return {
      ok: true,
      kind: 'address',
      normalizedInput,
      source: 'address_only',
      sourceLabel: 'Address Only',
    };
  }

  return {
    ok: false,
    kind: 'address',
    normalizedInput,
    source: null,
    sourceLabel: null,
    errorCode: 'INVALID_ADDRESS',
    errorMessage:
      'Enter a valid property listing URL or a full street address, for example "12 Main Road, Observatory, Cape Town".',
  };
}

export const PROPERTY_INPUT_MAX_LENGTH = MAX_INPUT_LENGTH;
