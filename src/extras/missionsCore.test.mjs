import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MISSIONS,
  missionCounts,
  missionsFor,
  targetSummary,
} from './missionsCore.js';

test('every mission has the fields the panels read', () => {
  const names = MISSIONS.map((x) => x.name);
  assert.equal(new Set(names).size, names.length);
  for (const x of MISSIONS) {
    assert.ok(x.name && x.agency && x.target && x.role, x.name);
    assert.ok(x.launched >= 1957 && x.launched <= 2030, x.name);
    assert.ok(['active', 'cruise', 'lost', 'ended'].includes(x.status), x.name);
  }
});

test('missionCounts counts only working or travelling spacecraft', () => {
  const counts = Object.fromEntries(
    missionCounts().map((c) => [c.target, c.count]),
  );
  assert.equal(counts.Mars, 8); // six orbiters and two rovers; MAVEN is lost
  assert.equal(counts.Moon, 6);
  assert.equal(counts.Venus, undefined);
});

test('missionsFor and targetSummary describe a target', () => {
  assert.equal(missionsFor('mars').length, 9);
  assert.equal(targetSummary('Mars'), 'Mars: 8 working, 1 lost');
  assert.equal(targetSummary('Venus'), 'Venus: 1 ended');
  assert.equal(targetSummary('Pluto'), 'Pluto: no spacecraft listed');
});
