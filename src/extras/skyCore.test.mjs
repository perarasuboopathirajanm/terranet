import assert from 'node:assert/strict';
import test from 'node:test';
import { SKY_BODIES, compassLabel, skyNow } from './skyCore.js';

test('compassLabel maps azimuths to eight points and wraps', () => {
  assert.equal(compassLabel(0), 'N');
  assert.equal(compassLabel(92), 'E');
  assert.equal(compassLabel(200), 'S');
  assert.equal(compassLabel(359), 'N');
  assert.equal(compassLabel(-90), 'W');
});

test('the Sun is high at London midsummer noon and down at midnight', () => {
  const london = { lat: 51.5, lon: 0 };
  const noon = skyNow(london, new Date('2026-06-21T12:00:00Z')).find(
    (b) => b.name === 'Sun',
  );
  const night = skyNow(london, new Date('2026-06-21T00:00:00Z')).find(
    (b) => b.name === 'Sun',
  );
  assert.ok(
    noon.up && noon.altitude > 55 && noon.altitude < 65,
    `${noon.altitude}`,
  );
  assert.equal(compassLabel(noon.azimuth), 'S');
  assert.equal(night.up, false);
});

test('skyNow returns every body and a Moon lit fraction between 0 and 1', () => {
  const rows = skyNow({ lat: 0, lon: 0 }, new Date('2026-11-10T12:00:00Z'));
  assert.deepEqual(
    rows.map((r) => r.name),
    SKY_BODIES,
  );
  const moon = rows.find((r) => r.name === 'Moon');
  assert.ok(moon.litFraction >= 0 && moon.litFraction <= 1);
  assert.ok(rows.every((r) => Number.isFinite(r.altitude)));
});
