import { readResponseTextCapped } from './common/http.js';

// The NASA Exoplanet Archive does not allow requests from a browser page, so
// the app asks this local route and the route asks NASA. The queries are fixed:
// callers cannot send their own ADQL.
const TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const LIST_QUERY =
  'select top 20 pl_name,hostname,disc_year,pl_rade,pl_masse,pl_eqt,sy_dist,' +
  'discoverymethod,disc_facility,releasedate from ps where default_flag=1 ' +
  'order by disc_year desc, releasedate desc';
const COUNT_QUERY = 'select count(*) as n from pscomppars';
const FRESH_MS = 60 * 60_000;
const RETRY_MS = 60_000;
const MAX_BYTES = 256 * 1024;

const text = (value, max = 120) =>
  typeof value === 'string' && value.trim() && value.length <= max
    ? value.trim().replace(/[\u0000-\u001f<>]/g, '')
    : null;
const num = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Validate NASA's rows into the small shape the browser panel renders. */
export function normalizePlanets(rows) {
  if (!Array.isArray(rows)) return null;
  const planets = [];
  for (const row of rows) {
    const name = text(row?.pl_name, 60);
    if (!name) continue;
    planets.push({
      name,
      star: text(row.hostname, 60),
      discoveredYear: num(row.disc_year),
      radiusEarth: num(row.pl_rade),
      massEarth: num(row.pl_masse),
      tempK: num(row.pl_eqt),
      distanceLy: num(row.sy_dist) === null ? null : num(row.sy_dist) * 3.26156,
      method: text(row.discoverymethod, 60),
      facility: text(row.disc_facility, 120),
      released: text(row.releasedate, 10),
    });
  }
  return planets;
}

async function query(fetchImpl, adql, signal) {
  const url = `${TAP_URL}?query=${encodeURIComponent(adql)}&format=json`;
  const response = await fetchImpl(url, { signal });
  if (!response.ok)
    throw new Error(`NASA Exoplanet Archive HTTP ${response.status}`);
  const body = await readResponseTextCapped(response, MAX_BYTES, signal);
  return JSON.parse(body);
}

/** Vite plugin serving GET /api/exoplanets (dev and preview servers). */
export function exoplanetProxy({
  fetchImpl = fetch,
  now = () => Date.now(),
  timeoutMs = 20_000,
} = {}) {
  let cache = null;
  let attemptedAt = -Infinity;
  let inflight = null;

  async function refresh() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const [list, count] = await Promise.all([
        query(fetchImpl, LIST_QUERY, controller.signal),
        query(fetchImpl, COUNT_QUERY, controller.signal).catch(() => null),
      ]);
      const planets = normalizePlanets(list);
      if (!planets?.length) throw new Error('malformed_exoplanet_data');
      const total = num(Number(count?.[0]?.n));
      cache = { planets, total, fetchedAt: now() };
      return cache;
    } finally {
      clearTimeout(timer);
    }
  }

  async function acquire() {
    if (cache && now() - cache.fetchedAt < FRESH_MS) return { value: cache };
    if (!inflight) {
      if (now() - attemptedAt < RETRY_MS) {
        return cache ? { value: cache, stale: true } : { error: 'retry_later' };
      }
      attemptedAt = now();
      inflight = refresh().finally(() => {
        inflight = null;
      });
    }
    try {
      return { value: await inflight };
    } catch {
      return cache ? { value: cache, stale: true } : { error: 'unavailable' };
    }
  }

  async function handler(req, res) {
    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'GET') return send(405, { error: 'method_not_allowed' });
    if (req.url !== '/' && req.url !== '') {
      return send(400, { error: 'invalid_exoplanet_query' });
    }
    const result = await acquire();
    if (result.error) return send(502, { error: result.error });
    return send(200, {
      source: 'NASA Exoplanet Archive',
      attribution: 'NASA Exoplanet Archive, Caltech/IPAC',
      fetchedAt: result.value.fetchedAt,
      stale: result.stale === true,
      totalConfirmed: result.value.total,
      planets: result.value.planets,
    });
  }

  const install = (server) => {
    server.middlewares.use('/api/exoplanets', (req, res) => {
      handler(req, res).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'internal_error' }));
      });
    });
  };
  return {
    name: 'exoplanets-proxy',
    configureServer: install,
    configurePreviewServer: install,
  };
}
