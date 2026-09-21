import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProperty24CompleteSections } from '@/lib/property24-complete-parser';

test('extracts the complete Property24 listing intelligence surface', () => {
  const html = '<div class="p24_listing" data-listingnumber="117328701"></div>' +
    '<h2>Property Overview</h2>' +
    '<div>Listing Number 117328701 Type of Property House Listing Date 18 June 2026 Erf Size 232 m² Floor Size 108 m² Rates and Taxes R 2,015 Pets Allowed Yes</div>' +
    '<h2>Rooms</h2>' +
    '<div>Bedrooms 3 Bathrooms 3 Kitchens 1 Reception Rooms 2</div>' +
    '<h2>External Features</h2>' +
    '<div>Parking 2 Parking 1 Secure Parking Parking 2 Shade Net Covered Parking</div>' +
    '<h2>Building</h2>' +
    '<div>Floor Wooden Floors Backup Water Water Tank Backup Power Backup Battery / Inverter</div>' +
    '<h2>Other Features</h2>' +
    '<div>Flatlet Yes</div>' +
    '<h2>Points of Interest</h2>' +
    '<div>Education St. Agnes\'S Primary 0.26 km Mountain Road Primary 0.53 km Food and Entertainment KFC 0.37 km Chandrani 0.56 km Shopping ABSA bank 0.42 km Standard Bank 0.53 km Transport and Public Services Woodstock 0.53 km Glass recycling bins 0.57 km</div>' +
    '<h2>Bond Calculator</h2>' +
    '<div>Monthly Repayment: R 42,431 Total Once-off Costs: R 395,169 Min Gross Monthly Income: R 141,437</div>';

  const result = parseProperty24CompleteSections(html);

  assert.equal(result.facts.listingNumber, '117328701');
  assert.equal(result.facts.listingDate, '18 June 2026');
  assert.equal(result.facts.propertyType, 'House');
  assert.equal(result.facts.landSizeM2, 232);
  assert.equal(result.facts.floorSizeM2, 108);
  assert.equal(result.facts.ratesAndTaxesCents, 201500);
  assert.equal(result.facts.petsAllowed, true);
  assert.equal(result.facts.bedrooms, 3);
  assert.equal(result.facts.bathrooms, 3);
  assert.equal(result.facts.kitchens, 1);
  assert.equal(result.facts.receptionRooms, 2);
  assert.deepEqual(result.facts.parkingDetails, ['Secure Parking', 'Shade Net Covered Parking']);
  assert.deepEqual(result.facts.flooring, ['Wooden Floors']);
  assert.deepEqual(result.facts.backupWater, ['Water Tank']);
  assert.deepEqual(result.facts.backupPower, ['Backup Battery / Inverter']);
  assert.equal(result.facts.flatlet, true);
  assert.equal(result.facts.property24MonthlyRepaymentCents, 4243100);
  assert.equal(result.facts.property24OnceOffCostsCents, 39516900);
  assert.equal(result.facts.property24MinimumGrossMonthlyIncomeCents, 14143700);

  assert.ok((result.facts.pointsOfInterest ?? []).some(p => p.name === "St. Agnes'S Primary" && p.distanceKm === 0.26));
  assert.ok((result.facts.pointsOfInterest ?? []).some(p => p.name === 'Woodstock' && p.distanceKm === 0.53));
  assert.ok(result.evidence.some(e => e.field === 'listingNumber'));
  assert.ok(result.evidence.some(e => e.field === 'pointsOfInterest'));
});
