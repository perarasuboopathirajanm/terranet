// Pure logic for the Atlas Eye alerts feed and watchlist. No DOM, no Cesium.

export const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson';
export const EONET_URL =
  'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60';

const EARTH_RADIUS_KM = 6371;

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/** Great-circle distance between two lon/lat points, in kilometres. */
export function distanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Turn a USGS GeoJSON summary into alert rows. Malformed features are skipped. */
export function parseUsgs(payload) {
  if (!payload || !Array.isArray(payload.features)) return [];
  const rows = [];
  for (const feature of payload.features) {
    const [lon, lat] = feature?.geometry?.coordinates ?? [];
    const props = feature?.properties ?? {};
    if (!finite(lon) || !finite(lat) || !finite(props.mag)) continue;
    rows.push({
      id: `usgs:${feature.id}`,
      kind: 'quake',
      title: props.title || `M${props.mag.toFixed(1)} earthquake`,
      lon,
      lat,
      time: finite(props.time) ? props.time : 0,
      severity: props.mag,
      url: typeof props.url === 'string' ? props.url : null,
    });
  }
  return rows;
}

/** Turn a NASA EONET event list into alert rows using each event's latest point. */
export function parseEonet(payload) {
  if (!payload || !Array.isArray(payload.events)) return [];
  const rows = [];
  for (const event of payload.events) {
    const geometries = Array.isArray(event?.geometry) ? event.geometry : [];
    const latest = [...geometries]
      .reverse()
      .find(
        (g) =>
          g?.type === 'Point' &&
          finite(g.coordinates?.[0]) &&
          finite(g.coordinates?.[1]),
      );
    if (!latest) continue;
    rows.push({
      id: `eonet:${event.id}`,
      kind: event.categories?.[0]?.id || 'event',
      title: event.title || 'Natural event',
      lon: latest.coordinates[0],
      lat: latest.coordinates[1],
      time: Date.parse(latest.date) || 0,
      severity: null,
      url: typeof event.link === 'string' ? event.link : null,
    });
  }
  return rows;
}

/** Newest first, duplicates removed by id. */
export function mergeAlerts(...lists) {
  const byId = new Map();
  for (const row of lists.flat()) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => b.time - a.time);
}

/** The first watched place whose radius contains the alert, or null. */
export function matchWatch(alert, watchlist) {
  for (const place of watchlist) {
    if (distanceKm(alert, place) <= place.radiusKm) return place;
  }
  return null;
}

/** Alerts that fall inside a watched place and were not announced before. */
export function newWatchHits(alerts, watchlist, announced) {
  const hits = [];
  for (const alert of alerts) {
    if (announced.has(alert.id)) continue;
    const place = matchWatch(alert, watchlist);
    if (place) hits.push({ alert, place });
  }
  return hits;
}

const KEY = 'atlas-eye.watchlist.v1';

/** Watchlist persistence over any Storage-like object (localStorage in the app). */
export function createWatchlistStore(storage) {
  const read = () => {
    try {
      const parsed = JSON.parse(storage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter(
            (p) =>
              typeof p?.id === 'string' &&
              typeof p?.name === 'string' &&
              finite(p.lon) &&
              finite(p.lat) &&
              finite(p.radiusKm),
          )
        : [];
    } catch {
      return [];
    }
  };
  const write = (list) => {
    try {
      storage.setItem(KEY, JSON.stringify(list));
    } catch {
      // Storage can be full or blocked; the in-memory list still works.
    }
    return list;
  };
  return {
    list: read,
    add({ name, lon, lat, radiusKm = 500 }) {
      const clean = String(name).trim().slice(0, 40) || 'Place';
      const radius = Math.min(5000, Math.max(10, Number(radiusKm) || 500));
      const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      return write([
        ...read(),
        { id, name: clean, lon, lat, radiusKm: radius },
      ]);
    },
    remove(id) {
      return write(read().filter((p) => p.id !== id));
    },
  };
}

export const GDACS_URL =
  'https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP';
export const FLARES_URL =
  'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json';
export const KP_URL =
  'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
export const AURORA_URL =
  'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';

const GDACS_KINDS = {
  EQ: 'quake',
  TC: 'severeStorms',
  FL: 'floods',
  VO: 'volcanoes',
  WF: 'wildfires',
  DR: 'drought',
};
// GDACS lists many low-level wildfires and small quakes that other feeds
// already cover, so Green is kept only for the event types it is rare for.
const GDACS_GREEN_KEPT = new Set(['TC', 'FL', 'VO']);

/** Turn a GDACS GeoJSON event list into alert rows (current, point events only). */
export function parseGdacs(payload) {
  if (!payload || !Array.isArray(payload.features)) return [];
  const rows = [];
  for (const feature of payload.features) {
    const [lon, lat] = feature?.geometry?.coordinates ?? [];
    const p = feature?.properties ?? {};
    if (feature?.geometry?.type !== 'Point') continue;
    if (!finite(lon) || !finite(lat) || p.iscurrent === 'false') continue;
    const level = p.alertlevel || 'Green';
    if (level === 'Green' && !GDACS_GREEN_KEPT.has(p.eventtype)) continue;
    const severity = level === 'Red' ? 3 : level === 'Orange' ? 2 : 1;
    rows.push({
      id: `gdacs:${p.eventtype}${p.eventid}`,
      kind: GDACS_KINDS[p.eventtype] || 'event',
      title: `${level.toUpperCase()}: ${p.name || p.description || 'Event'}`,
      lon,
      lat,
      time: Date.parse(p.datemodified || p.fromdate) || 0,
      severity,
      url: typeof p.url?.report === 'string' ? p.url.report : null,
    });
  }
  return rows;
}

/** Numeric strength of a GOES flare class such as "M2.5" (A, B, C, M, X). */
export function flareStrength(cls) {
  const match = /^([ABCMX])(\d+(?:\.\d+)?)$/.exec(String(cls ?? ''));
  if (!match) return 0;
  const base = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[match[1]];
  return base * Number(match[2]);
}

/** Recent flares, strongest class first within the newest `limit` events. */
export function parseFlares(payload, limit = 12) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((f) => typeof f?.max_class === 'string' && f.max_time)
    .map((f) => ({
      id: `flare:${f.max_time}`,
      cls: f.max_class,
      strength: flareStrength(f.max_class),
      time: Date.parse(f.max_time) || 0,
    }))
    .sort((a, b) => b.time - a.time)
    .slice(0, limit);
}

/** Latest planetary Kp value and a plain-language storm level. */
export function latestKp(payload) {
  if (!Array.isArray(payload)) return null;
  const rows = payload.filter((r) => finite(Number(r?.Kp)) && r.time_tag);
  const last = rows[rows.length - 1];
  if (!last) return null;
  const kp = Number(last.Kp);
  const level =
    kp >= 9
      ? 'G5 extreme storm'
      : kp >= 8
        ? 'G4 severe storm'
        : kp >= 7
          ? 'G3 strong storm'
          : kp >= 6
            ? 'G2 moderate storm'
            : kp >= 5
              ? 'G1 minor storm'
              : kp >= 4
                ? 'Active'
                : 'Quiet';
  return { kp, level, time: Date.parse(`${last.time_tag}Z`) || 0 };
}

/** Aurora probability grid points at or above `minValue` percent. */
export function auroraPoints(payload, minValue = 15) {
  const coords = payload?.coordinates;
  if (!Array.isArray(coords)) return [];
  const out = [];
  for (const row of coords) {
    const [lon, lat, value] = row;
    if (finite(lon) && finite(lat) && finite(value) && value >= minValue) {
      out.push({ lon: lon > 180 ? lon - 360 : lon, lat, value });
    }
  }
  return out;
}
