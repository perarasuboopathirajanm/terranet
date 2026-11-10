import assert from 'node:assert/strict';
import test from 'node:test';
import { exoplanetProxy, normalizePlanets } from './exoplanets.js';

const row = (extra = {}) => ({
  pl_name: 'TOI-1 b',
  hostname: 'TOI-1',
  disc_year: 2026,
  pl_rade: 2.5,
  pl_masse: null,
  pl_eqt: 500,
  sy_dist: 100,
  discoverymethod: 'Transit',
  disc_facility: 'TESS',
  releasedate: '2026-10-08',
  ...extra,
});

test('normalizePlanets converts parsecs to light years and nulls bad numbers', () => {
  const [p] = normalizePlanets([row({ pl_rade: 'x' })]);
  assert.equal(p.name, 'TOI-1 b');
  assert.equal(p.radiusEarth, null);
  assert.equal(p.massEarth, null);
  assert.ok(Math.abs(p.distanceLy - 326.156) < 0.01);
  assert.equal(normalizePlanets('nope'), null);
});

test('normalizePlanets drops rows without a safe name', () => {
  const planets = normalizePlanets([
    row({ pl_name: '' }),
    row({ pl_name: 'a'.repeat(200) }),
    row({ pl_name: 'Good <b>' }),
  ]);
  assert.equal(planets.length, 1);
  assert.equal(planets[0].name, 'Good b');
});

function runHandler(plugin, { method = 'GET', url = '/' } = {}) {
  let handler;
  plugin.configureServer({
    middlewares: { use: (_path, fn) => (handler = fn) },
  });
  return new Promise((resolve) => {
    const res = {
      headersSent: false,
      writeHead(status) {
        this.status = status;
      },
      end(body) {
        resolve({ status: this.status, body: JSON.parse(body) });
      },
    };
    handler({ method, url }, res);
  });
}

test('proxy serves normalized data and caches it', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls++;
    const body = decodeURIComponent(url).includes('count(*)')
      ? [{ n: 6000 }]
      : [row()];
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const plugin = exoplanetProxy({ fetchImpl });
  const first = await runHandler(plugin);
  assert.equal(first.status, 200);
  assert.equal(first.body.totalConfirmed, 6000);
  assert.equal(first.body.planets[0].name, 'TOI-1 b');
  const callsAfterFirst = calls;
  await runHandler(plugin);
  assert.equal(calls, callsAfterFirst);
});

test('proxy rejects other methods and query strings, and reports upstream failure', async () => {
  const failing = exoplanetProxy({
    fetchImpl: async () => new Response('no', { status: 500 }),
  });
  assert.equal((await runHandler(failing, { method: 'POST' })).status, 405);
  assert.equal(
    (await runHandler(failing, { url: '/?query=drop' })).status,
    400,
  );
  assert.equal((await runHandler(failing)).status, 502);
});
