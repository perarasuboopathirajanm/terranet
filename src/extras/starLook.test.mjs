import assert from 'node:assert/strict';
import test from 'node:test';
import { STAR_LOOK, sizeLine, starLook } from './starLook.js';
import { COSMOS_OBJECTS } from './cosmosCore.js';

test('every named star has a colour and a size', () => {
  for (const o of COSMOS_OBJECTS.filter((x) => x.kind === 'star')) {
    assert.ok(STAR_LOOK[o.name], o.name);
    assert.match(starLook(o.name).color, /^#[0-9a-f]{6}$/i);
  }
});

test('sizeLine compares with the Sun', () => {
  assert.match(sizeLine('Betelgeuse'), /764 times the Sun/);
  assert.equal(sizeLine('Unknown star'), 'star');
});
