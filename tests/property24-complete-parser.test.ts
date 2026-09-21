import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProperty24CompleteSections } from '@/lib/property24-complete-parser';

test('extracts the real Property24 Woodstock source-document surface', () => {
  const html = `
    <div class="p24_listing" data-listingnumber="117106348"></div>
    <script>window.loader.addCallback(function(){ renderComponent({"name":"BondCalculatorsDesktop","props":{"monthly":"R 999"}}); });</script>
    <style>.noise{display:none}</style>
    <h1>4 Bedroom House for Sale in Woodstock</h1>
    <div>42 Queens Rd, Woodstock, Cape Town</div>
    <div>Street Address 42 Queens Rd, Woodstock, Cape Town Listing Date 09 April 2026</div>
    <div>Victorian residence with heritage, design, and income potential. The property has been carefully reimagined into four individual studio suites, each offering a considered open-plan kitchen and living space. Currently, three of the suites operate as curated Airbnb accommodations, while the fourth is secured with a long-term tenant.</div>
    <h2>Property Overview</h2>
    <div>Listing Number 117106348 Type of Property House Listing Date 09 April 2026 Erf Size 110 m² Floor Size 200 m² Rates and Taxes R 1,232</div>
    <h2>Rooms</h2>
    <div>Bedrooms 4 Bathrooms 4 Reception Rooms 4</div>
    <h2>Points of Interest</h2>
    <div>Shopping Standard Bank 0.36km Standard Bank 0.64km Education Mountain Road Primary 0.39km Holy Cross Rc Primary 0.57km Transport and Public Services Glass recycling bins 0.43km Woodstock 0.72km Food and Entertainment Woodstock Lounge 0.65km Jamaica me Crazy 0.65km</div>
    <h2>Bond Calculator</h2>
    <div>Monthly Repayment: R 47 423 Total Once-off Costs: R 459 300 Min Gross Monthly Income: R 158 076</div>
    <h2>Recent Sales in and around Woodstock</h2>
    <a href="/property-values/19-devon-street/woodstock/cape-town/western-cape/x">19 Devon Street</a>
    <a href="/property-values/11a-milner-road/woodstock/cape-town/western-cape/x">11A Milner Road</a>
    <a href="/property-values/28a-dublin-street/woodstock/cape-town/western-cape/x">28A Dublin Street</a>
    <a href="/property-values/85-fairview-avenue/woodstock/cape-town/western-cape/x">85 Fairview Avenue</a>
    <a href="/property-values/1-balfour-street/woodstock/cape-town/western-cape/x">1 Balfour Street</a>
    <h2>Trends and Statistics</h2>
  `;

  const result = parseProperty24CompleteSections(html);

  assert.equal(result.facts.listingNumber, '117106348');
  assert.equal(result.facts.listingDate, '09 April 2026');
  assert.equal(result.facts.propertyType, 'House');
  assert.equal(result.facts.address, '42 Queens Rd, Woodstock, Cape Town');
  assert.equal(result.facts.landSizeM2, 110);
  assert.equal(result.facts.floorSizeM2, 200);
  assert.equal(result.facts.ratesAndTaxesCents, 123200);
  assert.equal(result.facts.bedrooms, 4);
  assert.equal(result.facts.bathrooms, 4);
  assert.equal(result.facts.receptionRooms, 4);
  assert.equal(result.facts.property24MonthlyRepaymentCents, 4742300);
  assert.equal(result.facts.property24OnceOffCostsCents, 45930000);
  assert.equal(result.facts.property24MinimumGrossMonthlyIncomeCents, 15807600);
  assert.ok(result.facts.description?.includes('four individual studio suites'));
  assert.ok(!result.facts.description?.includes('window.loader'));
  assert.ok(!result.facts.description?.includes('BondCalculatorsDesktop'));
  assert.ok(result.facts.property24NarrativeClaims?.some(claim => claim.type === 'studio_suites'));
  assert.ok(result.facts.property24NarrativeClaims?.some(claim => claim.type === 'rental_use'));
  assert.ok(result.facts.property24NarrativeClaims?.some(claim => claim.type === 'tenant'));
  assert.equal(result.facts.property24RecentSales?.length, 5);
  assert.ok(result.facts.property24RecentSales?.some(sale => sale.address === '19 Devon Street'));
  assert.ok(result.facts.property24RecentSales?.some(sale => sale.address === '1 Balfour Street'));
  assert.equal(result.sourceDocument.recentSales.length, 5);
  assert.ok(result.evidence.some(e => e.field === 'description'));
  assert.ok(result.evidence.some(e => e.field === 'property24RecentSales'));
});
