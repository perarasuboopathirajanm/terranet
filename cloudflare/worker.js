import './virtualFiles.js';
import { createNodeRouter } from './nodeAdapter.js';
import { weatherProxy } from '../server/providers/weather.js';
import { windProxy } from '../server/providers/wind.js';
import { gbfsProxy } from '../server/providers/gbfs.js';
import { terrainHeightsProxy } from '../server/providers/terrain.js';
import { radioBrowserProxy } from '../server/providers/radio.js';
import { inaturalistProxy } from '../server/providers/inaturalist/observations.js';
import { militaryInstallationsProxy } from '../server/providers/military-installations.js';
import { transitProxy } from '../server/providers/transit.js';
import { adsbdbProxy } from '../server/providers/aircraft/enrichment.js';
import { cycloneProxy } from '../server/providers/cyclones.js';
import { cctvProxy } from '../server/providers/cctv.js';
import { mapillaryProxy } from '../server/providers/mapillary.js';
import launchesSnapshot from './launches-snapshot.json';
import { acartiaProxy } from '../server/providers/acartia.js';
import { droneAirspaceProxy } from '../server/providers/droneAirspace.js';
import { gnssIntegrityProxy } from '../server/providers/gnssIntegrity.js';
import { overpassProxy } from '../server/providers/overpass.js';
import { firmsProxy } from '../server/providers/firms.js';
import { weatherEffectsProxy } from '../server/providers/regional/weather-effects.js';
import { openSkyProxy } from '../server/providers/aircraft/opensky.js';
import { adsbLolProxy } from '../server/providers/aircraft/adsb-lol.js';
import { tomtomProxy } from '../server/providers/traffic.js';
import { googlePlacesContextProxy } from '../server/providers/places.js';
import { normalizeFirePerimeterSnapshot } from '../src/layers/perimeters/records.js';

// Terranet on Cloudflare Workers: serves the built site and the few /api routes
// the browser cannot reach directly (CelesTrak and NASA send no CORS headers).
const CELESTRAK_GROUPS = new Set([
  'stations',
  'visual',
  'gps-ops',
  'glo-ops',
  'galileo',
  'geo',
  'resource',
  'weather',
  'planet',
  'sar',
  'science',
  'starlink',
  'active',
]);
const SATCAT_GROUPS = new Set([
  'stations',
  'visual',
  'gps-ops',
  'glo-ops',
  'galileo',
  'geo',
  'resource',
  'weather',
  'planet',
  'sar',
  'science',
]);
const TAP_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
const LIST_QUERY =
  'select top 20 pl_name,hostname,disc_year,pl_rade,pl_masse,pl_eqt,sy_dist,' +
  'discoverymethod,disc_facility,releasedate,ra,dec from ps where default_flag=1 ' +
  'order by disc_year desc, releasedate desc';
const COUNT_QUERY = 'select count(*) as n from pscomppars';

const json = (status, body, cache = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cache },
  });

const text = (v, max = 120) =>
  typeof v === 'string' && v.trim() && v.length <= max
    ? v.trim().replace(/[\u0000-\u001f<>]/g, '')
    : null;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

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
      raDeg: num(row.ra),
      decDeg: num(row.dec),
    });
  }
  return planets;
}

async function tap(adql) {
  const res = await fetch(
    `${TAP_URL}?query=${encodeURIComponent(adql)}&format=json`,
    {
      cf: { cacheTtl: 3600, cacheEverything: true },
    },
  );
  if (!res.ok) throw new Error(`NASA HTTP ${res.status}`);
  return res.json();
}

async function exoplanets() {
  try {
    const [list, count] = await Promise.all([
      tap(LIST_QUERY),
      tap(COUNT_QUERY).catch(() => null),
    ]);
    const planets = normalizePlanets(list);
    if (!planets?.length)
      return json(502, { error: 'malformed_exoplanet_data' });
    return json(
      200,
      {
        source: 'NASA Exoplanet Archive',
        attribution: 'NASA Exoplanet Archive, Caltech/IPAC',
        fetchedAt: Date.now(),
        stale: false,
        totalConfirmed: num(Number(count?.[0]?.n)),
        planets,
      },
      'public, max-age=600',
    );
  } catch {
    return json(502, { error: 'unavailable' });
  }
}

async function celestrak(url, ttl) {
  try {
    const res = await fetch(url, {
      cf: { cacheTtl: ttl, cacheEverything: true },
    });
    if (!res.ok) return json(502, { error: `upstream_${res.status}` });
    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': `public, max-age=${Math.min(ttl, 3600)}`,
      },
    });
  } catch {
    return json(502, { error: 'unavailable' });
  }
}

// Launch Library 2: recent launches (last 30 days), same query as the dev proxy.
// The free Launch Library allows few requests per hour per address, and
// Cloudflare shares addresses, so keep the last good answer in KV and serve it
// when the upstream refuses.
async function launches(env) {
  const KEY = 'launches';
  const FRESH_MS = 30 * 60 * 1000;
  const reply = (body, tag) =>
    new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'X-GEV-Cache': tag,
      },
    });
  let stored = null;
  try {
    stored = env?.CACHE ? await env.CACHE.get(KEY, 'json') : null;
  } catch {
    stored = null;
  }
  if (stored?.body && Date.now() - stored.at < FRESH_MS) {
    return reply(stored.body, 'KV');
  }
  const res = await launchesUpstream();
  if (res.ok) {
    const body = await res.text();
    if (env?.CACHE) {
      try {
        await env.CACHE.put(KEY, JSON.stringify({ at: Date.now(), body }), {
          expirationTtl: 7 * 86400,
        });
      } catch {
        /* serving the fresh copy still works */
      }
    }
    return reply(body, 'MISS');
  }
  if (stored?.body) return reply(stored.body, 'STALE');
  // Nothing stored and the upstream refused: show a saved list, not an error.
  return reply(JSON.stringify(launchesSnapshot), 'SNAPSHOT');
}

async function launchesUpstream() {
  const end = new Date(Math.floor(Date.now() / 60000) * 60000);
  const start = new Date(end.getTime() - 30 * 86400000);
  const u = new URL('https://ll.thespacedevs.com/2.3.0/launches/');
  u.searchParams.set('net__gte', start.toISOString());
  u.searchParams.set('net__lte', end.toISOString());
  u.searchParams.set('limit', '100');
  try {
    const res = await fetch(u, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'terranet-worker/1.0',
      },
      cf: { cacheTtl: 900, cacheEverything: true },
    });
    if (!res.ok) {
      return json(502, {
        error: 'Launch Library 2 unavailable',
        upstreamStatus: res.status,
      });
    }
    const body = await res.text();
    if (!Array.isArray(JSON.parse(body)?.results)) {
      return json(502, { error: 'malformed upstream response' });
    }
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
        'X-GEV-Cache': 'MISS',
      },
    });
  } catch {
    return json(502, { error: 'Launch Library 2 unavailable' });
  }
}

// Military aircraft: adsb.lol keyless feed.
async function military() {
  try {
    const res = await fetch('https://api.adsb.lol/v2/mil', {
      headers: { 'User-Agent': 'terranet-worker/1.0' },
      cf: { cacheTtl: 12, cacheEverything: true },
    });
    if (!res.ok)
      return json(res.status === 429 ? 429 : 502, {
        error: 'adsb.lol unavailable',
      });
    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Feed-Source': 'adsb.lol',
        'X-Feed-Cache': 'MISS',
      },
    });
  } catch {
    return json(502, { error: 'ADS-B proxy error' });
  }
}

// Civil aircraft: OpenSky anonymous snapshot (rate limited; may be refused).
async function flights() {
  try {
    const res = await fetch(
      'https://opensky-network.org/api/states/all?extended=1',
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'terranet-worker/1.0',
        },
        cf: { cacheTtl: 20, cacheEverything: true },
      },
    );
    if (!res.ok) {
      return json(res.status === 429 ? 429 : 502, {
        error: 'opensky_unavailable',
      });
    }
    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Feed-Source': 'OpenSky Network',
        'X-Feed-Cache': 'MISS',
      },
    });
  } catch {
    return json(502, { error: 'opensky_unavailable' });
  }
}

// NIFC WFIGS current fire perimeters (keyless).
const FIRE_URL =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/' +
  'WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?' +
  new URLSearchParams({
    where: '1=1',
    outFields: [
      'poly_IncidentName',
      'attr_UniqueFireIdentifier',
      'attr_IncidentSize',
      'attr_PercentContained',
      'attr_POOState',
      'attr_IncidentTypeCategory',
      'attr_FireDiscoveryDateTime',
      'poly_DateCurrent',
      'attr_FireCause',
      'attr_FireBehaviorGeneral',
      'attr_TotalIncidentPersonnel',
      'attr_POOCounty',
      'attr_EstimatedCostToDate',
      'attr_IncidentComplexityLevel',
      'attr_CpxName',
    ].join(','),
    maxAllowableOffset: '0.001',
    outSR: '4326',
    f: 'geojson',
  }).toString();

async function firePerimeters() {
  try {
    const features = [];
    for (let page = 0; page < 5; page++) {
      const url =
        page === 0 ? FIRE_URL : `${FIRE_URL}&resultOffset=${features.length}`;
      const res = await fetch(url, {
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (!res.ok) throw new Error('upstream');
      const payload = await res.json();
      if (!Array.isArray(payload?.features))
        throw new Error('invalid_snapshot');
      features.push(...payload.features);
      const more =
        payload.exceededTransferLimit === true ||
        payload.properties?.exceededTransferLimit === true;
      if (!more || !payload.features.length) break;
    }
    const rows = normalizeFirePerimeterSnapshot({ features });
    return json(200, { fetchedAt: Date.now(), rows }, 'public, max-age=300');
  } catch {
    return json(502, { error: 'fire_perimeters_unavailable' });
  }
}

// Workers cannot fetch with redirect:'error'. Follow it as 'manual' and fail on a redirect.
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  if (init?.redirect !== 'error') return nativeFetch(input, init);
  const res = await nativeFetch(input, { ...init, redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    await res.body?.cancel();
    throw new TypeError('unexpected redirect');
  }
  return res;
};

let router = null;
function getRouter() {
  router ||= createNodeRouter([
    weatherProxy(),
    windProxy(),
    gbfsProxy(),
    terrainHeightsProxy(),
    radioBrowserProxy(),
    inaturalistProxy(),
    militaryInstallationsProxy(),
    transitProxy(),
    adsbdbProxy(),
    cycloneProxy(),
    cctvProxy({ sourceRoot: '/' }),
    mapillaryProxy(),
    acartiaProxy(),
    droneAirspaceProxy(),
    gnssIntegrityProxy(),
    overpassProxy(),
    firmsProxy(),
    weatherEffectsProxy(),
    openSkyProxy(),
    adsbLolProxy(),
    tomtomProxy(),
    googlePlacesContextProxy(),
  ]);
  return router;
}

const CAMERA_KEY = 'cctv-sources';
const SOURCES_URL = 'https://terranet.local/api/cctv/sources';

/** Build the camera list now (slow) and keep a copy in KV for the next six hours. */
async function buildCameraList(env, request) {
  const res = await getRouter()(request);
  if (!res || !res.ok) return res;
  const body = await res.text();
  if (env.CACHE) {
    await env.CACHE.put(CAMERA_KEY, body, {
      expirationTtl: 2 * 86400,
      metadata: { at: Date.now() },
    });
    try {
      await env.CACHE.put(LITE_KEY, liteBody(body), {
        expirationTtl: 2 * 86400,
      });
    } catch (error) {
      console.warn('[worker] lite list failed:', error?.message);
    }
  }
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'X-Cache': 'BUILT',
    },
  });
}

const LITE_KEY = 'cctv-sources-lite';
const LITE_MAX = 1500;

/** Every Nth camera, so all countries stay represented in a smaller list. */
function liteBody(body, max = LITE_MAX) {
  const data = JSON.parse(body);
  const all = Array.isArray(data.sources) ? data.sources : [];
  if (all.length <= max) return body;
  const step = all.length / max;
  const sources = [];
  for (let i = 0; i < max; i++) sources.push(all[Math.floor(i * step)]);
  return JSON.stringify({ ...data, sources, lite: true });
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=3600',
};

/**
 * The 3D camera layer was built for a few thousand cameras, so it asks for
 * ?limit=1500. The country browser asks for the full list.
 */
async function cameraListLite(request, env, ctx) {
  if (env.CACHE) {
    const lite = await env.CACHE.get(LITE_KEY, 'stream');
    if (lite) {
      return new Response(lite, {
        headers: { ...JSON_HEADERS, 'X-Cache': 'KV-LITE' },
      });
    }
    const full = await env.CACHE.get(CAMERA_KEY, 'text');
    if (full) {
      try {
        const body = liteBody(full);
        ctx.waitUntil(
          env.CACHE.put(LITE_KEY, body, { expirationTtl: 2 * 86400 }),
        );
        return new Response(body, {
          headers: { ...JSON_HEADERS, 'X-Cache': 'LITE-BUILT' },
        });
      } catch (error) {
        console.warn('[worker] lite list failed:', error?.message);
      }
    }
  }
  return cameraListFull(request, env, ctx);
}

/** Serve the stored camera list; build it only when nothing is stored. */
async function cameraList(request, env, ctx) {
  const limit = new URL(request.url).searchParams.get('limit');
  if (limit) return cameraListLite(request, env, ctx);
  return cameraListFull(request, env, ctx);
}

async function cameraListFull(request, env, ctx) {
  if (env.CACHE) {
    const stored = await env.CACHE.get(CAMERA_KEY, 'stream');
    if (stored) {
      return new Response(stored, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'KV',
        },
      });
    }
  }
  return buildCameraList(env, request);
}

export default {
  // Every six hours: rebuild the camera list so visitors never wait for it.
  async scheduled(_event, env, ctx) {
    // Also keep the launch list warm so the Space Missions tab never starts empty.
    ctx.waitUntil(
      launchesUpstream()
        .then(async (res) => {
          if (!res.ok || !env.CACHE) return;
          await env.CACHE.put(
            'launches',
            JSON.stringify({ at: Date.now(), body: await res.text() }),
            { expirationTtl: 7 * 86400 },
          );
        })
        .catch(() => {}),
    );
    ctx.waitUntil(
      buildCameraList(env, new Request(SOURCES_URL)).catch((error) =>
        console.warn('[worker] camera refresh failed:', error?.message),
      ),
    );
  },
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      // The OpenStreetMap place search (sea marks, ski, ...) posts its query.
      const postOk =
        request.method === 'POST' &&
        (pathname === '/api/overpass' || pathname.startsWith('/api/overpass/'));
      if (request.method !== 'GET' && !postOk)
        return json(405, { error: 'method_not_allowed' });
      if (pathname === '/api/cctv/sources')
        return cameraList(request, env, ctx);
      if (pathname === '/api/exoplanets') return exoplanets();
      if (pathname === '/api/launches') return launches(env);
      if (pathname === '/api/military') return military();
      if (pathname === '/api/flights') {
        // The app's own provider first (it falls back between feeds), then the
        // plain OpenSky snapshot.
        let routed = null;
        try {
          routed = await getRouter()(request);
        } catch {
          routed = null;
        }
        if (routed?.ok) return routed;
        const plain = await flights();
        return plain.ok ? plain : (routed ?? plain);
      }
      if (pathname === '/api/fire-perimeters') return firePerimeters();
      let m = pathname.match(/^\/api\/celestrak\/([a-z0-9-]+)$/);
      if (m && CELESTRAK_GROUPS.has(m[1])) {
        const u = new URL('https://celestrak.org/NORAD/elements/gp.php');
        u.searchParams.set('GROUP', m[1]);
        u.searchParams.set('FORMAT', 'tle');
        return celestrak(u.toString(), 6 * 3600);
      }
      m = pathname.match(/^\/api\/celestrak-satcat\/([a-z0-9-]+)$/);
      if (m && SATCAT_GROUPS.has(m[1])) {
        const u = new URL('https://celestrak.org/satcat/records.php');
        u.searchParams.set('GROUP', m[1]);
        u.searchParams.set('FORMAT', 'CSV');
        return celestrak(u.toString(), 24 * 3600);
      }
      try {
        const handled = await getRouter()(request);
        if (handled) return handled;
      } catch (error) {
        console.warn('[worker] router error:', error?.message);
        return json(502, { error: 'unavailable' });
      }
      return json(404, { error: 'not_available_on_this_host' });
    }
    return env.ASSETS.fetch(request);
  },
};
