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
  {
    match: /^(HST|HUBBLE)/i,
    src: '/textures/satellites/hubble.jpg',
    caption:
      'The Hubble Space Telescope after release from the Space Shuttle Atlantis (NASA)',
  },
  {
    match: /^LANDSAT/i,
    src: '/textures/satellites/landsat.jpg',
    caption: "Artist's concept: a Landsat satellite over Earth (NASA/Goddard)",
  },
  {
    match: /^TERRA$/i,
    src: '/textures/satellites/terra.jpg',
    caption:
      'Not the satellite itself: the Arabian Empty Quarter dunes, as imaged by Terra (NASA/GSFC/METI/ERSDAC/JAROS and the U.S./Japan ASTER team)',
  },
  {
    match: /^AQUA$/i,
    src: '/textures/satellites/aqua.jpg',
    caption:
      "Not the satellite itself: fires in the Balkans, as imaged by Aqua's MODIS (NASA, Jeff Schmaltz, MODIS Rapid Response)",
  },
  {
    match: /^FERMI/i,
    src: '/textures/satellites/fermi.jpg',
    caption: 'A model of the Fermi Gamma-ray Space Telescope (NASA)',
  },
  {
    match: /^(SWIFT|NEIL GEHRELS)/i,
    src: '/textures/satellites/swift.jpg',
    caption: 'A model of the Swift gamma-ray burst observatory (NASA E/PO, Sonoma State University)',
  },
  {
    match: /^CHANDRA/i,
    src: '/textures/satellites/chandra.jpg',
    caption:
      'Not the telescope itself: the supernova remnant 0519-69.0, imaged by Chandra X-rays with Hubble (NASA/CXC/Rutgers)',
  },
  {
    match: /^TESS/i,
    src: '/textures/satellites/tess.jpg',
    caption:
      "Artist's concept: the Transiting Exoplanet Survey Satellite, TESS (NASA)",
  },
  {
    match: /NAVSTAR|^GPS /i,
    src: '/textures/satellites/gps.jpg',
    caption: "Artist's concept: a GPS Block IIF satellite (NASA)",
  },
  {
    match: /^STARLINK/i,
    src: '/textures/satellites/starlink.jpg',
    caption: 'A Starlink mission (SpaceX, public domain CC0)',
  },
]);

/** The picture entry for a satellite name, or null when there is none. */
export function imageForSatellite(name, list = SATELLITE_IMAGES) {
  const text = String(name ?? '');
  return list.find((entry) => entry.match.test(text)) ?? null;
}
