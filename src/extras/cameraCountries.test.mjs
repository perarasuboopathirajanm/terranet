import assert from 'node:assert/strict';
import test from 'node:test';
import { countryOf, groupByCountry } from './cameraCountries.js';

test('countryOf maps networks to countries and falls back to Other', () => {
  assert.equal(countryOf({ sourceKind: 'tfl-open-data' }), 'United Kingdom');
  assert.equal(countryOf({ sourceKind: 'mlit-river' }), 'Japan');
  assert.equal(countryOf({ sourceKind: 'something-new' }), 'Other');
  assert.equal(countryOf(null), 'Other');
});

test('groupByCountry counts, boxes and sorts', () => {
  const rows = groupByCountry([
    { sourceKind: 'tfl-open-data', lat: 51.5, lon: -0.1 },
    { sourceKind: 'tfl-open-data', lat: 51.6, lon: -0.3 },
    { sourceKind: 'mlit-river', lat: 35, lon: 139 },
    { sourceKind: 'mlit-river' },
    { sourceKind: 'mlit-river' },
  ]);
  assert.deepEqual(
    rows.map((r) => [r.country, r.count]),
    [
      ['Japan', 3],
      ['United Kingdom', 2],
    ],
  );
  const uk = rows.find((r) => r.country === 'United Kingdom');
  assert.equal(uk.west, -0.3);
  assert.equal(uk.north, 51.6);
  assert.ok(uk.hasBox);
  assert.deepEqual(groupByCountry(undefined), []);
});
