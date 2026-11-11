import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COSMOS_OBJECTS,
  cosmosWithPositions,
  formatDistance,
  galacticPosition,
  lightTravelTime,
  planetsNow,
  sunJourney,
} from './cosmosCore.js';
import { niceLength } from './cosmosView.js';

test('the galactic centre lies along +X at about 26,700 ly', () => {
  const [x, y, z] = galacticPosition(266.405, -28.936, 26_700);
  assert.ok(x > 26_600 && x <= 26_700, `x ${x}`);
  assert.ok(Math.abs(y) < 200 && Math.abs(z) < 200, `y ${y} z ${z}`);
});

test('positions keep the stated distance from the Sun', () => {
  for (const o of cosmosWithPositions()) {
    assert.ok(Math.abs(Math.hypot(o.x, o.y, o.z) / o.ly - 1) < 1e-9, o.name);
  }
});

test('catalogue has unique names, valid angles and positive distances', () => {
  const names = COSMOS_OBJECTS.map((o) => o.name);
  assert.equal(new Set(names).size, names.length);
  for (const o of COSMOS_OBJECTS) {
    assert.ok(o.ra >= 0 && o.ra < 360 && o.dec >= -90 && o.dec <= 90, o.name);
    assert.ok(o.ly > 0, o.name);
  }
});

test('formatDistance picks sensible units', () => {
  assert.equal(formatDistance(4.24), '4.24 light-years');
  assert.equal(formatDistance(26_700), '26,700 light-years');
  assert.equal(formatDistance(2_500_000), '2.50 million light-years');
  assert.equal(formatDistance(1.2e10), '12.00 billion light-years');
  assert.equal(formatDistance(1 / 63_241.077), '1.00 AU');
  assert.equal(formatDistance(-1), 'unknown');
});

test('lightTravelTime reads in words', () => {
  assert.equal(lightTravelTime(4.24), 'light left it 4 years ago');
  assert.equal(
    lightTravelTime(2_500_000),
    'light left it 2.5 million years ago',
  );
  assert.equal(lightTravelTime(0), 'unknown');
});

test('planetsNow places Earth about 1 AU out', () => {
  const earth = planetsNow(new Date('2026-01-01T00:00:00Z')).find(
    (p) => p.name === 'Earth',
  );
  assert.ok(earth.au > 0.98 && earth.au < 1.02, `${earth.au}`);
});

test('sunJourney reports a galactic year near 230 million years', () => {
  const j = sunJourney();
  assert.equal(j.galacticYearMyr, 230);
  assert.equal(j.orbitsSoFar, 20);
});

test('niceLength rounds to 1, 2 or 5 times a power of ten', () => {
  assert.equal(niceLength(140), 100);
  assert.equal(niceLength(260), 200);
  assert.equal(niceLength(730), 500);
  assert.equal(niceLength(0.03), 0.02);
});
