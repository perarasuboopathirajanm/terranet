import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACK_HOLES,
  STARS,
  directionFor,
  filterByName,
  parseTle,
  satellitePosition,
  solarSystemNow,
} from './exploreCore.js';

const ISS = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9993
2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.49560000 00019`;

test('catalogue entries have valid coordinates', () => {
  for (const o of [...STARS, ...BLACK_HOLES]) {
    assert.ok(o.ra >= 0 && o.ra < 360, `${o.name} ra`);
    assert.ok(o.dec >= -90 && o.dec <= 90, `${o.name} dec`);
    assert.ok(o.note.length > 0);
  }
  const names = [...STARS, ...BLACK_HOLES].map((o) => o.name);
  assert.equal(new Set(names).size, names.length);
});

test('directionFor returns a unit vector toward the pole for Polaris', () => {
  const polaris = STARS.find((s) => s.name === 'Polaris');
  const [x, y, z] = directionFor(polaris);
  assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 1e-9);
  assert.ok(z > 0.999);
});

test('filterByName matches substrings case-insensitively', () => {
  assert.deepEqual(
    filterByName(STARS, 'SIRI').map((s) => s.name),
    ['Sirius'],
  );
  assert.equal(filterByName(STARS, '').length, STARS.length);
  assert.equal(filterByName(STARS, 'zzzz').length, 0);
});

test('parseTle reads three-line sets and skips junk', () => {
  const parsed = parseTle(`${ISS}\nBROKEN\nnot a tle\nat all`);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'ISS (ZARYA)');
});

test('satellitePosition gives a plausible low-orbit position', () => {
  const [iss] = parseTle(ISS);
  const pos = satellitePosition(iss, new Date('2024-01-01T13:00:00Z'));
  assert.ok(pos, 'expected a position');
  assert.ok(Math.abs(pos.lat) <= 52, `lat ${pos.lat}`);
  assert.ok(pos.altKm > 350 && pos.altKm < 460, `alt ${pos.altKm}`);
  assert.equal(satellitePosition({ line1: 'x', line2: 'y' }), null);
});

test('solarSystemNow lists Sun, Moon and planets with valid coordinates', () => {
  const bodies = solarSystemNow(new Date('2026-06-21T12:00:00Z'));
  assert.equal(bodies.length, 9);
  for (const b of bodies) {
    assert.ok(b.ra >= 0 && b.ra < 360, `${b.name} ra ${b.ra}`);
    assert.ok(b.dec >= -90 && b.dec <= 90, `${b.name} dec`);
  }
  // Near the June solstice the Sun sits at about +23 degrees declination.
  const sun = bodies.find((b) => b.name === 'Sun');
  assert.ok(sun.dec > 22 && sun.dec < 24, `sun dec ${sun.dec}`);
});
