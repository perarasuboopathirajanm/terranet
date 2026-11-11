import assert from 'node:assert/strict';
import test from 'node:test';
import { BODY_INFO, bodyFacts, solarBodies } from './solarBodies.js';
import { LY_PER_AU } from './cosmosCore.js';

const WHEN = new Date('2026-01-01T00:00:00Z');

test('solarBodies returns the Sun, eight planets and the Moon', () => {
  const bodies = solarBodies(WHEN);
  assert.deepEqual(
    bodies.map((b) => b.name),
    [
      'Sun',
      'Mercury',
      'Venus',
      'Earth',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Moon',
    ],
  );
  for (const b of bodies) assert.ok(BODY_INFO[b.name], b.name);
});

test('planets sit at their known distances from the Sun', () => {
  const by = Object.fromEntries(solarBodies(WHEN).map((b) => [b.name, b]));
  assert.ok(by.Earth.au > 0.98 && by.Earth.au < 1.02);
  assert.ok(by.Jupiter.au > 4.9 && by.Jupiter.au < 5.5);
  assert.ok(by.Neptune.au > 29.5 && by.Neptune.au < 30.5);
  const ly = Math.hypot(by.Earth.x, by.Earth.y) / LY_PER_AU;
  assert.ok(Math.abs(ly - by.Earth.au) < 0.02, `${ly} vs ${by.Earth.au}`);
});

test('the Moon stays within about 0.003 AU of Earth', () => {
  const by = Object.fromEntries(solarBodies(WHEN).map((b) => [b.name, b]));
  const dx = (by.Moon.x - by.Earth.x) / LY_PER_AU;
  const dy = (by.Moon.y - by.Earth.y) / LY_PER_AU;
  assert.ok(Math.hypot(dx, dy) < 0.003);
  assert.ok(by.Moon.au > 0.0023 && by.Moon.au < 0.0028, `${by.Moon.au}`);
});

test('bodyFacts gives readable rows', () => {
  const earth = solarBodies(WHEN).find((b) => b.name === 'Earth');
  const rows = bodyFacts(earth);
  assert.match(rows[0], /12,742 km across/);
  assert.ok(rows.some((r) => r.startsWith('moons:')));
});
