# EiX Property Decision API: feature inventory for verification

Status tags: **[T]** covered by an automated test (`npm test`, 59 scenarios) · **[S]** rule or fact checked against a source in research · **[H]** my default or heuristic, tunable, not validated against real outcomes · **[U]** not tested live or not built.
The JSON API is the full product. The standalone HTML report (`npm run analyze`) is an earlier subset (see section 13).

## 1. Inputs
| Feature | Detail | Tag |
|---|---|---|
| Structured facts | `property`: askingPrice (R50k to R200m) plus bedrooms, bathrooms, parking, floorAreaM2, erfM2, ratesMonthly, levyMonthly, propertyType, titleType, suburb, city, title, features | T |
| Listing URL | `url` (optionally with `html` you already hold). Rendered with Playwright, then parsed | T for html path; U for live pages |
| Buyer | profile (first_time, investor, upgrader), depositPercent (default 10), interestRate (default 10.5), termYears (default 20), grossMonthlyIncome, expectedMonthlyRent, vatSale | T |
| Comparable sales | up to 50: price, floorAreaM2, erfM2, soldDate, address | T |
| Rental comparables | up to 50: monthlyRent, floorAreaM2, address | T |
| Neighbourhood | opt-in: location, priorities (preset or 0-5 weights), metrics, osm flag | T |
| Strict validation | unknown fields rejected, ranges checked, errors name the field | T |

## 2. Extraction (url/html source)
- JSON-LD first (price, beds, baths, floor size, suburb), then text patterns. Reads both "Beds 3 Bathroom 2 parking 1" and "3 Bedroom" layouts. [T on 4 saved real listings: 3 MG property pages, 1 Chas Everitt]
- Fields: price, bedrooms, bathrooms (incl. 1.5), parking, floor size, erf/land size, levy, rates, suburb, city, property type, title type (sectional inferred from levy, apartment type or "sectional title/body corporate"; freehold from "freehold/freestanding"), 19 feature keywords, listing coordinates (kept only inside South Africa). [T]
- Levy or rates under R50 treated as not stated (agents type "R 1"). [T]
- City from URL or text after "for sale in" (separates Observatory Cape Town from Observatory Johannesburg). [T]
- Missing values stay null and are never guessed. Optional Claude fallback fills only fields the page states. [U for the fallback]
- Bot-block page detection, price sanity check, clear "supply the HTML instead" errors. [T]
- Not built: Facebook listings, address-only lookup. [U]

## 3. Costs (`costs`, `assumptions`)
- Monthly bond (standard amortisation): R3.15m at 10.5% over 20 years = R31,448.97. [T]
- Rates, levy, upkeep reserve (1% of value a year [H]), monthly total. [T]
- Transfer duty from the SARS table (0% to R1.21m; 3%; 6%; 8%; 11%; 13% above R13.31m), unchanged for 2026/27; R0 for a VAT sale. R3.5m = R162,356. [T, S]
- Legal and bond fees estimated at 3% of price [H]. Cash to close = deposit + duty + fees (R3.5m at 10% = R617,356). [T]
- Income required: bond ÷ 30% [H], and the same if rates rise 2 points. Bond-to-income percent when income given. [T]
- Stress test grid: deposits 0/10/20% × rates -1/0/+1/+2 points. [T]
- Default rate is prime 10.5% after the SARB's 23 July 2026 decision; update manually. [S, U for September]

## 4. Price evidence (`priceEvidence`)
- Comparable benchmark needs 3+ sales: median R/m² of floor area (when 3+ comparables have floor size and the property does) or median price. Gap %, position (above/in line/below at ±7% [H]), strength (6+ = strong, 3-5 = moderate), discussion range 95%-100% of benchmark when above. [T]
- Cape Town municipal-value bracket from the rates bill, using three published tariff sets (0.007159 with R450k exempt; 0.007010 with R605k; 0.006428 with R620k). 2026/27 sources conflict, so it is a range. [T, S]
- R/m² of floor and erf, floor-to-erf ratio. [T]

## 5. Ownership and rental (`ownership`, `scorecard.rental`)
- Cost of owning before principal, principal repaid in month one. [T]
- Break-even: price rise needed to recover buying costs plus 6% selling costs [H]; years at 3%, 6% and 9% growth. [T]
- Rent: supplied, or estimated from 3+ rental comparables (median, quartile range, R/m² when sizes allow). Gross yield, net yield (5% vacancy, rates, levy, 1% upkeep [H]), monthly cash flow, whether rent covers costs. [T]

## 6. Risks (`risks`: 13 stable codes)
FLOOR_AREA_MISSING · TITLE_TYPE_UNKNOWN · LEVY_NOT_STATED · HIGH_SITE_COVERAGE (over 80%) · POSSIBLE_UNAPPROVED_ADDITIONS (bathrooms ≥ bedrooms, not sectional) · NO_BACKUP_POWER_OR_WATER · LOW_DEPOSIT (under 10%) · HIGH_BOND_TO_INCOME (over 30%) · NO_COMPARABLES · ABOVE_MUNICIPAL_VALUE (over 5% above the bracket) · OLDER_PROPERTY (period keywords) · AREA_SAFETY_CONCERN · AREA_PRICES_FALLING. Severity high/medium/low. Triggers are [H]; codes are [T].

## 7. Scorecard (`scorecard`)
- **Confidence 0-100** (evidence in hand): asking price 10, physical facts 20, rates 5, levy and title 10, price evidence 30 (6+ sales) / 20 (3-5) / 8 (municipal only), rental evidence 15 (comparables) / 8 (supplied), buyer income 10. Bands Low/Moderate/High. [T, H]
- **Investment score 0-100**: weighted average of only the components the evidence supports: price position (30, or 12 if municipal-only), rental return (30 investor / 10 other), affordability (15 / 30), rental cash flow (when no income), running costs (8), property risks (12). Capped at price score + 30 when comparables exist. Withheld (null) below 30% confidence; `provisional` below 60%. Bands Strong/Good/Fair/Weak/Poor. [T, H]
- **Risk score 0-100** (higher is riskier): base 10 + flag points (high 22, medium 10, low 3), +10 if a 2-point rate rise pushes the bond over 40% of income. Null below 30% confidence. [T, H]
- **Decision label**: BUY needs confidence 70+, score 75+, risk 35 or less, bond within 30% of income, price within 7% of benchmark (investors also 6%+ net yield). WALK AWAY needs confidence 60+ and (price over 20% above 6+ sales, or bond over 45% of income, or score under 35). NEGOTIATE when price is over 7% above the benchmark. Otherwise PROCEED WITH CAUTION. Includes reasons and a next step. [T, H]
- **Note:** the response has two verdict fields: `verdict.code` (evidence state: GATHER_EVIDENCE, NEGOTIATE, PRICED_IN_LINE, PRICED_BELOW_BENCHMARK, AFFORDABILITY_STRETCH) and `scorecard.decision.label` (your four labels). Display `scorecard.decision`.

## 8. Neighbourhood DNA (`neighbourhood`, opt-in)
- Nine dimensions, 0-100 with evidence text and source. From OpenStreetMap: walkability, public transport, schools nearby (access, not quality), lifestyle and dining, green space, healthcare. Supplied by you: safety (crime per 100k vs a benchmark), price momentum (5-year growth), buyer demand (median days on market). [T with a fixed fixture; U against live OpenStreetMap]
- Presets balanced, family, young_professional, retiree, investor, or custom weights. Fit %, coverage, provisional flag, strengths, trade-offs. [T]
- Archetype label (for example "Walkable urban village"). [T, H]
- Poor safety or falling prices add risks and lift the risk score; fit added to verdict reasons. [T]
- Fails soft when OpenStreetMap is down or coordinates are missing (status partial, no invented scores). OSM attribution returned. 24-hour cache. [T]
- Scoring thresholds are my defaults. [H]

## 9. Buyer document pack (`documents`, up to 13 items)
Each item has priority, stage (before offer / with offer / before signing / during transfer), who gets it, cost type, why, how, link or null, the report risks it settles, and `basis`.
- Cape Town, checked against City pages: valuation roll (free, GV2025 from 1 July 2026), City Map and Zoning Viewer (free; zoning, overlays, heritage status), building plans (owner or authorised person only, small fee). [S]
- Checked against practitioner sources: rates clearance certificate (section 118, 60 days, conveyancer applies), body corporate pack, levy clearance certificate. [S]
- Standard practice, not checked against a municipal page: rates account, comparable sales, bond pre-approval, compliance certificates, inspection, title deed search, and all non-Cape Town entries (generic, no links). [H]
- Adapts to title type, older property, missing comparables. The API does not fetch documents. [T]

## 10. Offer plan and agent questions
Three "before you offer" steps, five suggested offer conditions, and 6-7 tailored agent questions. [T for presence]

## 11. Evidence audit
Eight facts each tagged `listing`, `supplied`, `listing_ai_extracted` or `not_stated`, plus the assumptions used (rate and date, deposit, term, fees, upkeep, income rule, selling costs, vacancy, duty basis). [T]

## 12. API platform
- Routes: `POST /v1/decisions`, `GET /v1/health`, `GET /v1/openapi.json`. [T]
- Bearer keys (stored hashed), per-client rate limit with RateLimit headers and Retry-After, idempotency keys (24 hours, in memory), request ids, JSON logs, 2 MB limit, CORS allowlist, SIGTERM drain. [T except CORS and logs]
- Errors as problem+json with codes UNAUTHORIZED, RATE_LIMITED, VALIDATION_FAILED, INVALID_JSON, UNSUPPORTED_MEDIA_TYPE, BODY_TOO_LARGE, URL_NOT_ALLOWED, INSUFFICIENT_DATA, ANALYSIS_FAILED, IDEMPOTENCY_KEY_REUSED, BUSY, NOT_FOUND, METHOD_NOT_ALLOWED, INTERNAL_ERROR. [T for most]
- Host allowlist and redirect re-check, 2 concurrent browser renders. [T for allowlist; U for redirect and renders]
- OpenAPI 3.1 spec; every test response is validated against it. [T]
- Dockerfile and CI workflow. [U: image not built, CI not run]

## 13. Standalone HTML report (`npm run analyze`)
Costs, stress test, price check, buy-or-rent and break-even, watch-outs, offer conditions, agent questions and a facts table. It does not include the scorecard, neighbourhood or documents. Flags: --profile --deposit --rate --term --income --rent --vat --city --comps --price --floor --erf --levy --rates --html. [T for the engine; U for live URLs]

## 14. Not included (check these are acceptable)
- No sales or rental data feed, so price fairness and rental estimates need your comparables.
- No school quality, load-shedding, water, noise or condition data; no photo analysis.
- Not tested: live Property24/PrivateProperty pages, live OpenStreetMap, Docker build, deployment.
- Idempotency and rate limits are in memory (single instance). Nothing is stored; there is no GET by id.
- No PDF or HTML output from the API, no payments, webhooks or accounts.
- Municipal-value cross-check and direct links are Cape Town only.
- Prime rate, transfer duty table and Cape Town tariffs are updated by hand.
- Scoring weights and thresholds are unvalidated defaults; tune them before you rely on BUY or WALK AWAY.
