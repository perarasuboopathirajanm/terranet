import { twoline2satrec, propagate, gstime, eciToGeodetic } from 'satellite.js';
import * as Astronomy from 'astronomy-engine';
import { raDecToUnitVector } from '../sky/stars.js';
import { SKY_BODIES } from './skyCore.js';

// Positions are J2000 right ascension and declination in degrees.
export const STARS = Object.freeze([
  {
    name: 'Sirius',
    ra: 101.287,
    dec: -16.716,
    note: 'Brightest star in the night sky, 8.6 ly',
  },
  {
    name: 'Canopus',
    ra: 95.988,
    dec: -52.696,
    note: 'Second brightest, about 310 ly',
  },
  {
    name: 'Alpha Centauri',
    ra: 219.902,
    dec: -60.834,
    note: 'Nearest bright star system, 4.4 ly',
  },
  {
    name: 'Proxima Centauri',
    ra: 217.429,
    dec: -62.68,
    note: 'Closest known star, 4.2 ly',
  },
  { name: 'Arcturus', ra: 213.915, dec: 19.182, note: 'Orange giant, 37 ly' },
  { name: 'Vega', ra: 279.235, dec: 38.784, note: 'Blue-white, 25 ly' },
  {
    name: 'Capella',
    ra: 79.172,
    dec: 45.998,
    note: 'Binary of two yellow giants, 43 ly',
  },
  {
    name: 'Rigel',
    ra: 78.634,
    dec: -8.202,
    note: 'Blue supergiant in Orion, about 860 ly',
  },
  {
    name: 'Betelgeuse',
    ra: 88.793,
    dec: 7.407,
    note: 'Red supergiant in Orion, about 550 ly',
  },
  {
    name: 'Procyon',
    ra: 114.825,
    dec: 5.225,
    note: 'Bright neighbour, 11.5 ly',
  },
  {
    name: 'Achernar',
    ra: 24.429,
    dec: -57.237,
    note: 'Flattened blue star, 140 ly',
  },
  { name: 'Altair', ra: 297.696, dec: 8.868, note: 'Fast spinner, 17 ly' },
  { name: 'Aldebaran', ra: 68.98, dec: 16.509, note: 'Eye of Taurus, 65 ly' },
  {
    name: 'Antares',
    ra: 247.352,
    dec: -26.432,
    note: 'Red supergiant in Scorpius, about 550 ly',
  },
  {
    name: 'Spica',
    ra: 201.298,
    dec: -11.161,
    note: 'Close binary in Virgo, 250 ly',
  },
  {
    name: 'Pollux',
    ra: 116.329,
    dec: 28.026,
    note: 'Orange giant with a known planet, 34 ly',
  },
  {
    name: 'Fomalhaut',
    ra: 344.413,
    dec: -29.622,
    note: 'Star with a dust ring, 25 ly',
  },
  {
    name: 'Deneb',
    ra: 310.358,
    dec: 45.28,
    note: 'Distant supergiant, about 2,600 ly',
  },
  { name: 'Regulus', ra: 152.093, dec: 11.967, note: 'Heart of Leo, 79 ly' },
  { name: 'Polaris', ra: 37.955, dec: 89.264, note: 'The North Star' },
  {
    name: "Barnard's Star",
    ra: 269.452,
    dec: 4.693,
    note: 'Fast-moving red dwarf, 6 ly',
  },
  {
    name: 'TRAPPIST-1',
    ra: 346.622,
    dec: -5.041,
    note: 'Red dwarf with seven planets, 40 ly',
  },
]);

export const BLACK_HOLES = Object.freeze([
  {
    name: 'Sagittarius A*',
    ra: 266.417,
    dec: -29.008,
    note: 'Milky Way centre, about 4.3 million suns, 26,700 ly',
  },
  {
    name: 'M87*',
    ra: 187.706,
    dec: 12.391,
    note: 'First black hole imaged, about 6.5 billion suns, 53 million ly',
  },
  {
    name: 'Cygnus X-1',
    ra: 299.59,
    dec: 35.202,
    note: 'First confirmed black hole, about 21 suns, 7,200 ly',
  },
  {
    name: 'V404 Cygni',
    ra: 306.016,
    dec: 33.867,
    note: 'Feeds on a companion star, about 9 suns, 7,800 ly',
  },
  {
    name: 'Gaia BH1',
    ra: 262.171,
    dec: -0.581,
    note: 'One of the nearest known, about 10 suns, 1,560 ly',
  },
  {
    name: 'A0620-00',
    ra: 95.685,
    dec: -0.346,
    note: 'Nearby X-ray binary, about 6.6 suns, 3,300 ly',
  },
  {
    name: 'TON 618',
    ra: 187.104,
    dec: 31.477,
    note: 'Ultramassive, about 66 billion suns, 10 billion ly',
  },
]);

/** ICRF direction (unit vector) for a catalogue position. */
export function directionFor(object) {
  return raDecToUnitVector(object.ra, object.dec);
}

/** Case-insensitive name filter; an empty query keeps everything. */
export function filterByName(list, query) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase();
  return q ? list.filter((o) => o.name.toLowerCase().includes(q)) : list;
}

/** Parse CelesTrak three-line TLE text into named entries. */
export function parseTle(text) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const [name, line1, line2] = [lines[i], lines[i + 1], lines[i + 2]];
    if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
      out.push({ name: name.trim(), line1, line2 });
    }
  }
  return out;
}

/** Sub-satellite point and altitude (km) for a TLE entry at a moment, or null. */
export function satellitePosition(entry, date = new Date()) {
  try {
    const satrec = twoline2satrec(entry.line1, entry.line2);
    const state = propagate(satrec, date);
    if (!state?.position) return null;
    const geo = eciToGeodetic(state.position, gstime(date));
    const lon = (geo.longitude * 180) / Math.PI;
    const lat = (geo.latitude * 180) / Math.PI;
    if (![lon, lat, geo.height].every(Number.isFinite)) return null;
    return { lon, lat, altKm: geo.height };
  } catch {
    return null;
  }
}

const AU_KM = 149_597_870.7;

/**
 * The Sun, Moon and planets as they are right now, in the same J2000 form as
 * the star list (ra, dec in degrees), with their distance in the note.
 */
export function solarSystemNow(date = new Date()) {
  const observer = new Astronomy.Observer(0, 0, 0);
  return SKY_BODIES.map((name) => {
    const eq = Astronomy.Equator(name, date, observer, false, true);
    const km = eq.dist * AU_KM;
    const note =
      name === 'Moon'
        ? `${Math.round(km).toLocaleString()} km away`
        : `${eq.dist.toFixed(2)} AU from Earth (${(eq.dist * 8.317).toFixed(1)} light-minutes)`;
    return { name, ra: eq.ra * 15, dec: eq.dec, note };
  });
}
