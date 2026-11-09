import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createWatchlistStore,
  distanceKm,
  matchWatch,
  mergeAlerts,
  newWatchHits,
  parseEonet,
  parseUsgs,
} from './alertsCore.js';

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, v),
  };
};

test('distanceKm is roughly right for a known pair', () => {
  const london = { lon: -0.1278, lat: 51.5074 };
  const paris = { lon: 2.3522, lat: 48.8566 };
  const d = distanceKm(london, paris);
  assert.ok(d > 335 && d < 350, `got ${d}`);
});

test('parseUsgs keeps valid features and skips malformed ones', () => {
  const rows = parseUsgs({
    features: [
      {
        id: 'a1',
        geometry: { coordinates: [10, 20, 5] },
        properties: {
          mag: 5.2,
          time: 1000,
          title: 'M 5.2 - Test',
          url: 'https://x',
        },
      },
      {
        id: 'bad',
        geometry: { coordinates: ['x', 1] },
        properties: { mag: 5 },
      },
      { id: 'nomag', geometry: { coordinates: [1, 1] }, properties: {} },
    ],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 'usgs:a1');
  assert.equal(rows[0].severity, 5.2);
  assert.deepEqual(parseUsgs(null), []);
});

test('parseEonet uses the latest point geometry', () => {
  const rows = parseEonet({
    events: [
      {
        id: 'E1',
        title: 'Wildfire X',
        categories: [{ id: 'wildfires' }],
        geometry: [
          { type: 'Point', date: '2026-01-01T00:00:00Z', coordinates: [1, 2] },
          { type: 'Point', date: '2026-01-02T00:00:00Z', coordinates: [3, 4] },
        ],
      },
      {
        id: 'E2',
        title: 'Polygon only',
        geometry: [{ type: 'Polygon', coordinates: [] }],
      },
    ],
  });
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].lon, rows[0].lat], [3, 4]);
  assert.equal(rows[0].kind, 'wildfires');
});

test('mergeAlerts sorts newest first and removes duplicate ids', () => {
  const merged = mergeAlerts(
    [
      { id: 'a', time: 1 },
      { id: 'b', time: 3 },
    ],
    [{ id: 'a', time: 2 }],
  );
  assert.deepEqual(
    merged.map((r) => r.id),
    ['b', 'a'],
  );
});

test('watchlist matching respects radius and announced ids', () => {
  const watch = [{ id: 'w1', name: 'Home', lon: 0, lat: 0, radiusKm: 200 }];
  const near = { id: 'n', lon: 0.5, lat: 0.5 };
  const far = { id: 'f', lon: 20, lat: 20 };
  assert.equal(matchWatch(near, watch)?.name, 'Home');
  assert.equal(matchWatch(far, watch), null);
  assert.equal(newWatchHits([near, far], watch, new Set()).length, 1);
  assert.equal(newWatchHits([near], watch, new Set(['n'])).length, 0);
});

test('watchlist store round-trips, clamps radius and drops corrupt data', () => {
  const storage = memoryStorage();
  const store = createWatchlistStore(storage);
  assert.deepEqual(store.list(), []);
  const list = store.add({
    name: '  Tokyo  ',
    lon: 139.7,
    lat: 35.7,
    radiusKm: 99999,
  });
  assert.equal(list[0].name, 'Tokyo');
  assert.equal(list[0].radiusKm, 5000);
  assert.equal(store.list().length, 1);
  store.remove(list[0].id);
  assert.equal(store.list().length, 0);
  storage.setItem('atlas-eye.watchlist.v1', '{not json');
  assert.deepEqual(store.list(), []);
});
