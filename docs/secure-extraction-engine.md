# EiXPropScore™ Secure Extraction Engine

## Purpose

The extraction boundary is evidence-first and fail-safe. A submitted URL can only produce a report when the engine can establish that it is a specific listing on an allowlisted source and that enough evidence exists to support the report.

## Supported sources

- Property24
- Private Property
- Rawson
- Pam Golding
- Seeff
- RE/MAX
- Harcourts
- Century 21
- Jawitz, including `m.jawitz.co.za`

## Security boundary

1. HTTPS only.
2. No credentials in URLs.
3. Exact allowlisted source domains/subdomains.
4. DNS resolution before every request.
5. Private, loopback, link-local, multicast and metadata-style destinations are rejected.
6. Redirects are manual, limited, and must remain on the same allowlisted source.
7. Response content type is restricted to HTML/XHTML.
8. Response size is capped at 4 MB.
9. Request time is capped at 12 seconds.
10. Tracking parameters are removed during canonicalisation.
11. Search/category/agent pages cannot enter the report pipeline.

These controls are intentionally layered. Application-level validation is not a substitute for network-level egress controls in production; Vercel/network policy should also restrict outbound traffic to the approved property domains where the deployment architecture permits it.

## Evidence hierarchy

Structured JSON-LD is preferred, followed by semantic HTML extraction and the existing source-specific extractor as a compatibility adapter. Every extracted field retains its retrieval method and source URL.

The AI/report layer receives validated property facts and evidence rather than arbitrary page HTML.

## Failure policy

The engine returns an explicit non-success state for:

- unsupported domains
- search/index pages
- dead listings
- HTTP failures
- timeouts
- oversized responses
- unsupported content types
- insufficient property evidence
- critical factual conflicts

A failure must never be converted into a completed report.

## Database audit

`property_extraction_runs` stores each extraction attempt. `property_extraction_evidence` stores field-level provenance. `property_extraction_conflicts` stores conflicting values and their resolution state. All three tables have RLS enabled and are intended to be accessed only through the server-side service-role client.

## Production browser rendering

The current implementation deliberately does not silently introduce a browser runtime into the Next.js dependency graph. Dynamic/browser-only pages therefore fail honestly unless the page exposes usable server-rendered/structured evidence. A dedicated sandboxed browser worker can be attached behind the same source allowlist without changing the report contract. That worker must enforce the same URL, DNS, redirect, timeout, memory and network controls before rendering a page.

## Regression corpus

The regression suite includes real listing URL shapes from the current EiXPropScore™ corpus, including Property24, Private Property, Rawson, Pam Golding, Seeff, RE/MAX, Harcourts, Century 21 and Jawitz, plus mobile URLs, tracking parameters, search pages and non-standard property types.

Run locally:

```bash
npm test
npm run typecheck
npm run build
```
