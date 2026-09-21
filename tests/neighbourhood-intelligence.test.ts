import test from 'node:test';
import assert from 'node:assert/strict';
import { listingLocationFromTitle, neighbourhoodSummary } from '@/lib/neighbourhood-intelligence';

test('neighbourhood summary reports real nearby evidence instead of a generic evidence-required placeholder', () => {
  const result = neighbourhoodSummary([
    {
      name: 'Example Station',
      category: 'station',
      distanceKm: 1.234,
      sourceUrl: 'https://www.openstreetmap.org/node/1',
    },
  ]);
  assert.equal(result, 'Example Station · 1.2 km');
});

test('neighbourhood summary is explicit when evidence is unavailable', () => {
  assert.equal(neighbourhoodSummary([], 'No supporting evidence found'), 'No supporting evidence found');
});

test('listing title provides a usable neighbourhood anchor when address fields are missing', () => {
  assert.equal(
    listingLocationFromTitle('5 Bedroom House for Sale in Camps Bay'),
    'Camps Bay',
  );
});

test('listing title parser does not invent a location when the title has no sale location', () => {
  assert.equal(listingLocationFromTitle('5 Bedroom House'), null);
});
