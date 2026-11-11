import * as Astronomy from 'astronomy-engine';
import { LY_PER_AU } from './cosmosCore.js';

// Facts are rounded published values. Moon counts grow as new ones are
// confirmed, so the large planets carry a "+".
export const BODY_INFO = Object.freeze({
  Sun: {
    texture: '2k_sun.jpg',
    color: '#ffe36b',
    diameterKm: 1_392_700,
    period: 'orbits the galaxy in about 230 million years',
    moons: null,
    note: 'A star holding 99.8% of the solar system mass',
  },
  Mercury: {
    texture: '2k_mercury.jpg',
    color: '#b5a79a',
    diameterKm: 4879,
    period: '88 days',
    moons: '0',
    note: 'Smallest planet, closest to the Sun',
  },
  Venus: {
    texture: '2k_venus_atmosphere.jpg',
    color: '#e8c98f',
    diameterKm: 12_104,
    period: '225 days',
    moons: '0',
    note: 'Hottest planet, under thick clouds',
  },
  Earth: {
    texture: '2k_earth_daymap.jpg',
    color: '#6bd0ff',
    diameterKm: 12_742,
    period: '365.25 days',
    moons: '1',
    note: 'Our home',
  },
  Moon: {
    texture: '2k_moon.jpg',
    color: '#d8d8d8',
    diameterKm: 3474,
    period: '27.3 days around Earth',
    moons: null,
    note: 'Earth only natural satellite',
  },
  Mars: {
    texture: '2k_mars.jpg',
    color: '#d9774a',
    diameterKm: 6779,
    period: '687 days',
    moons: '2',
    note: 'The red planet, studied by orbiters and rovers',
  },
  Jupiter: {
    texture: '2k_jupiter.jpg',
    color: '#d9b38c',
    diameterKm: 139_820,
    period: '11.9 years',
    moons: '95+',
    note: 'Largest planet',
  },
  Saturn: {
    texture: '2k_saturn.jpg',
    color: '#e6d3a0',
    diameterKm: 116_460,
    period: '29.4 years',
    moons: '270+',
    note: 'Famous for its rings',
    rings: true,
  },
  Uranus: {
    texture: '2k_uranus.jpg',
    color: '#9fe6ea',
    diameterKm: 50_724,
    period: '84 years',
    moons: '28+',
    note: 'Ice giant tipped on its side',
  },
  Neptune: {
    texture: '2k_neptune.jpg',
    color: '#5b7bff',
    diameterKm: 49_244,
    period: '165 years',
    moons: '16',
    note: 'Farthest planet, windiest world',
  },
});

const PLANETS = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

function toEcliptic(vector) {
  const v = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), vector);
  return v;
}

/**
 * The Sun, planets and Moon at a moment, as seen looking down on the ecliptic.
 * Positions are in light-years from the Sun; `au` is the heliocentric distance
 * (for the Moon, its distance from Earth in AU).
 */
export function solarBodies(date = new Date()) {
  const bodies = [{ name: 'Sun', kind: 'sun', x: 0, y: 0, au: 0 }];
  let earth = null;
  for (const name of PLANETS) {
    const v = toEcliptic(Astronomy.HelioVector(name, date));
    const body = {
      name,
      kind: 'planet',
      x: v.x * LY_PER_AU,
      y: v.y * LY_PER_AU,
      au: Math.hypot(v.x, v.y, v.z),
    };
    if (name === 'Earth') earth = v;
    bodies.push(body);
  }
  const moon = toEcliptic(Astronomy.GeoVector('Moon', date, true));
  bodies.push({
    name: 'Moon',
    kind: 'moon',
    x: (earth.x + moon.x) * LY_PER_AU,
    y: (earth.y + moon.y) * LY_PER_AU,
    au: Math.hypot(moon.x, moon.y, moon.z),
  });
  return bodies;
}

/** Rows of text for a body's info card. */
export function bodyFacts(body) {
  const info = BODY_INFO[body.name];
  if (!info) return [];
  const rows = [`${info.diameterKm.toLocaleString('en-US')} km across`];
  if (body.kind === 'planet') {
    rows.push(`${body.au.toFixed(3)} AU from the Sun right now`);
    rows.push(`one year: ${info.period}`);
    rows.push(`moons: ${info.moons}`);
  } else if (body.kind === 'moon') {
    rows.push(
      `${Math.round(body.au * 149_597_870.7).toLocaleString('en-US')} km from Earth right now`,
    );
    rows.push(info.period);
  } else {
    rows.push(info.period);
  }
  rows.push(info.note);
  return rows;
}
