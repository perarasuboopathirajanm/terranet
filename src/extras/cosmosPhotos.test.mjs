import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COSMOS_PHOTOS, cosmosPhoto } from './cosmosPhotos.js';

test('every listed picture exists on disk and has a caption', () => {
  for (const [name, p] of Object.entries(COSMOS_PHOTOS)) {
    assert.ok(
      fs.existsSync(new URL(`../../public${p.src}`, import.meta.url)),
      `${name} file ${p.src}`,
    );
    assert.match(p.caption, /^(Real image|Artist's concept)/, name);
  }
});

test('planets, black holes and galaxies are covered', () => {
  for (const name of [
    'Sun',
    'Mercury',
    'Venus',
    'Earth',
    'Moon',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
    'M87*',
    'Sagittarius A*',
    'Andromeda (M31)',
  ])
    assert.ok(cosmosPhoto(name), name);
  assert.equal(cosmosPhoto('Nobody'), null);
});
