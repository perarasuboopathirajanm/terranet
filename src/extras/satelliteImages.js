// Pictures for named satellites. Add a row per picture: put the file in
// public/textures/satellites/ and list the names it belongs to. `match` is
// tested against the satellite's catalogue name (case-insensitive).
export const SATELLITE_IMAGES = Object.freeze([
  {
    match: /^ISS \(ZARYA\)/i,
    src: '/textures/satellites/iss-zarya.png',
    caption: 'Zarya, the first module of the International Space Station',
  },
  {
    match: /SOYUZ/i,
    src: '/textures/satellites/soyuz.webp',
    caption: 'Soyuz spacecraft',
  },
]);

/** The picture entry for a satellite name, or null when there is none. */
export function imageForSatellite(name, list = SATELLITE_IMAGES) {
  const text = String(name ?? '');
  return list.find((entry) => entry.match.test(text)) ?? null;
}
