import { resampleWindGrid, weatherScalarMetadata } from './grid.js';

// Fallback wind source for hosts that cannot run the ecCodes WASM decoder
// (Cloudflare Workers). Open-Meteo serves the current 10 m wind as plain JSON,
// so no GRIB decoding is needed. It needs no key. A coarse global grid keeps the
// request count low; the result is smoothed up to the layer's normal 1° grid.
const STEP = 12; // degrees between sample points (480 points: inside the free 600-per-minute limit)
const CHUNK = 120; // locations per request
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/** Sample points, north to south, west to east from longitude 0. */
export function openMeteoPoints(step = STEP) {
  const ni = Math.round(360 / step);
  const nj = Math.round(180 / step) + 1;
  const points = [];
  for (let j = 0; j < nj; j += 1)
    for (let i = 0; i < ni; i += 1) {
      const lon = i * step;
      points.push({ lat: 90 - j * step, lon: lon > 180 ? lon - 360 : lon });
    }
  return { ni, nj, points };
}

/** Meteorological wind (speed, direction it blows FROM) to u/v components. */
export function windToUv(speed, directionDeg) {
  const rad = (directionDeg * Math.PI) / 180;
  return { u: -speed * Math.sin(rad), v: -speed * Math.cos(rad) };
}

async function fetchChunk(points, { fetchImpl, signal, overlay }) {
  const fields = ['wind_speed_10m', 'wind_direction_10m'];
  if (overlay === 'temperature') fields.push('temperature_2m');
  if (overlay === 'pressure') fields.push('pressure_msl');
  const query = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lon).join(','),
    current: fields.join(','),
    wind_speed_unit: 'ms',
  });
  const response = await fetchImpl(`${ENDPOINT}?${query}`, { signal });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  const body = await response.json();
  const list = Array.isArray(body) ? body : [body];
  if (list.length !== points.length) throw new Error('Open-Meteo short reply');
  return list.map((entry) => entry.current);
}

/** Same result shape as fetchGfsWind, built from Open-Meteo JSON. */
export async function fetchOpenMeteoWind({
  fetchImpl = fetch,
  now = () => Date.now(),
  targetDx = 1,
  signal,
  overlay = 'none',
} = {}) {
  const metadata = weatherScalarMetadata(overlay);
  const { ni, nj, points } = openMeteoPoints();
  const chunks = [];
  for (let i = 0; i < points.length; i += CHUNK)
    chunks.push(points.slice(i, i + CHUNK));
  const rows = [];
  // Four requests at a time keeps well under the host's subrequest limits.
  for (let i = 0; i < chunks.length; i += 4) {
    const batch = await Promise.all(
      chunks
        .slice(i, i + 4)
        .map((chunk) => fetchChunk(chunk, { fetchImpl, signal, overlay })),
    );
    rows.push(...batch.flat());
  }
  const u = new Float64Array(ni * nj);
  const v = new Float64Array(ni * nj);
  const scalar = metadata ? new Float64Array(ni * nj) : undefined;
  rows.forEach((row, index) => {
    const speed = Number(row?.wind_speed_10m);
    const dir = Number(row?.wind_direction_10m);
    const wind = Number.isFinite(speed) && Number.isFinite(dir)
      ? windToUv(speed, dir)
      : { u: 0, v: 0 };
    u[index] = wind.u;
    v[index] = wind.v;
    if (scalar) {
      const value = Number(
        overlay === 'temperature' ? row?.temperature_2m : row?.pressure_msl,
      );
      scalar[index] = Number.isFinite(value)
        ? value
        : overlay === 'temperature'
          ? 0
          : 1013;
    }
  });
  const grid = resampleWindGrid({
    u,
    v,
    ...(scalar ? { scalar } : {}),
    ni,
    nj,
    lo1: 0,
    la1: 90,
    di: STEP,
    dj: STEP,
    dx: targetDx,
    dy: targetDx,
  });
  const nowMs = now();
  const d = new Date(nowMs);
  const pad = (n) => String(n).padStart(2, '0');
  const hour = d.getUTCHours();
  const runIso = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour),
  ).toISOString();
  return {
    cycle: {
      date: `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`,
      hour,
      forecastHour: 0,
      runIso,
      validIso: runIso,
    },
    level: '10 m above ground',
    units: 'm/s',
    grid,
    ...(metadata ? { scalar: metadata } : {}),
  };
}
