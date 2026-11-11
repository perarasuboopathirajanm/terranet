import assert from 'node:assert/strict';
import test from 'node:test';
import { imageForSatellite } from './satelliteImages.js';

test('finds the picture for a named satellite', () => {
  assert.match(imageForSatellite('ISS (ZARYA)').src, /iss-zarya/);
  assert.match(imageForSatellite('soyuz-ms 25').src, /soyuz/);
});

test('returns null when there is no picture', () => {
  assert.equal(imageForSatellite('KNACKSAT-2'), null);
  assert.equal(imageForSatellite(undefined), null);
});
