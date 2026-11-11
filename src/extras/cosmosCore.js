import * as Astronomy from 'astronomy-engine';

// Distances are in light-years from the Sun unless noted. They are rounded
// published values; deep-sky distances carry real uncertainty (noted per row).
export const LY_PER_AU = 1 / 63_241.077;
export const KM_PER_LY = 9.4607304725808e12;
export const AU_KM = 149_597_870.7;

// Sun's distance to the Milky Way's centre (Sagittarius A*): about 26,700 ly.
export const SUN_TO_CENTRE_LY = 26_700;
// Visible disc of the Milky Way is roughly 100,000 ly across.
export const MILKY_WAY_RADIUS_LY = 52_000;
// The Sun circles the galactic centre at about 230 km/s, once every ~230
// million years (estimates run 225 to 250 million).
export const SUN_ORBIT_SPEED_KMS = 230;
export const GALACTIC_YEAR_MYR = 230;
// The Sun also drifts about 20 km/s relative to nearby stars, toward the
// constellation Hercules (the "solar apex").
export const SUN_LOCAL_DRIFT_KMS = 20;

// J2000 equatorial to galactic rotation (IAU). Galactic X points at the centre.
const EQ_TO_GAL = [
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762],
];

/** Galactic Cartesian position (ly) of an object at J2000 ra/dec (deg) and distance. */
export function galacticPosition(raDeg, decDeg, distanceLy) {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const v = [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ];
  return EQ_TO_GAL.map(
    (row) => (row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) * distanceLy,
  );
}

const object = (name, kind, ra, dec, ly, note, uncertain = false) => ({
  name,
  kind,
  ra,
  dec,
  ly,
  note,
  uncertain,
});

export const COSMOS_OBJECTS = Object.freeze([
  // Nearby stars
  object(
    'Proxima Centauri',
    'star',
    217.429,
    -62.68,
    4.24,
    'Closest known star',
  ),
  object(
    'Alpha Centauri',
    'star',
    219.902,
    -60.834,
    4.37,
    'Nearest bright star system',
  ),
  object(
    "Barnard's Star",
    'star',
    269.452,
    4.693,
    5.96,
    'Fast-moving red dwarf',
  ),
  object(
    'Sirius',
    'star',
    101.287,
    -16.716,
    8.6,
    'Brightest star in the night sky',
  ),
  object('Procyon', 'star', 114.825, 5.225, 11.46, 'Bright neighbour'),
  object('Altair', 'star', 297.696, 8.868, 16.7, 'Fast spinner'),
  object('Vega', 'star', 279.235, 38.784, 25.0, 'Blue-white star'),
  object('Fomalhaut', 'star', 344.413, -29.622, 25.1, 'Star with a dust ring'),
  object('Pollux', 'star', 116.329, 28.026, 33.8, 'Orange giant with a planet'),
  object('Arcturus', 'star', 213.915, 19.182, 36.7, 'Orange giant'),
  object(
    'TRAPPIST-1',
    'star',
    346.622,
    -5.041,
    40.7,
    'Red dwarf with seven planets',
  ),
  object('Capella', 'star', 79.172, 45.998, 42.9, 'Two yellow giants'),
  object('Aldebaran', 'star', 68.98, 16.509, 65, 'Eye of Taurus'),
  object('Regulus', 'star', 152.093, 11.967, 79, 'Heart of Leo'),
  object('Spica', 'star', 201.298, -11.161, 250, 'Close binary in Virgo'),
  object(
    'Betelgeuse',
    'star',
    88.793,
    7.407,
    550,
    'Red supergiant (estimates 500 to 700 ly)',
    true,
  ),
  object(
    'Antares',
    'star',
    247.352,
    -26.432,
    550,
    'Red supergiant in Scorpius',
    true,
  ),
  object(
    'Rigel',
    'star',
    78.634,
    -8.202,
    860,
    'Blue supergiant in Orion',
    true,
  ),
  object('Deneb', 'star', 310.358, 45.28, 2600, 'Distant supergiant', true),
  // Black holes
  object(
    'Gaia BH1',
    'blackhole',
    262.171,
    -0.581,
    1560,
    'One of the nearest known, about 10 suns',
  ),
  object(
    'A0620-00',
    'blackhole',
    95.685,
    -0.346,
    3300,
    'X-ray binary, about 6.6 suns',
    true,
  ),
  object(
    'Cygnus X-1',
    'blackhole',
    299.59,
    35.202,
    7200,
    'First confirmed black hole, about 21 suns',
  ),
  object(
    'V404 Cygni',
    'blackhole',
    306.016,
    33.867,
    7800,
    'Feeds on a companion star, about 9 suns',
    true,
  ),
  object(
    'Sagittarius A*',
    'blackhole',
    266.417,
    -29.008,
    26_700,
    'Milky Way centre, about 4.3 million suns',
  ),
  object(
    'M87*',
    'blackhole',
    187.706,
    12.391,
    53_500_000,
    'First black hole imaged, about 6.5 billion suns',
  ),
  // Galaxies
  object(
    'Sagittarius Dwarf',
    'galaxy',
    283.83,
    -30.48,
    70_000,
    'Dwarf galaxy being absorbed by the Milky Way',
    true,
  ),
  object(
    'Large Magellanic Cloud',
    'galaxy',
    80.894,
    -69.756,
    160_000,
    'Satellite galaxy of the Milky Way',
  ),
  object(
    'Small Magellanic Cloud',
    'galaxy',
    13.187,
    -72.829,
    200_000,
    'Satellite galaxy of the Milky Way',
    true,
  ),
  object(
    'Andromeda (M31)',
    'galaxy',
    10.685,
    41.269,
    2_500_000,
    'Nearest large galaxy; will merge with us in billions of years',
  ),
  object(
    'Triangulum (M33)',
    'galaxy',
    23.462,
    30.66,
    2_730_000,
    'Third-largest in the Local Group',
    true,
  ),
  object(
    'Sculptor (NGC 253)',
    'galaxy',
    11.888,
    -25.288,
    11_400_000,
    'Starburst galaxy',
    true,
  ),
  object(
    'M81 (Bode)',
    'galaxy',
    148.888,
    69.065,
    11_800_000,
    'Spiral galaxy in Ursa Major',
    true,
  ),
  object(
    'Centaurus A',
    'galaxy',
    201.365,
    -43.019,
    12_000_000,
    'Active galaxy',
    true,
  ),
  object(
    'Pinwheel (M101)',
    'galaxy',
    210.8,
    54.349,
    21_000_000,
    'Face-on spiral',
    true,
  ),
  object(
    'Whirlpool (M51)',
    'galaxy',
    202.47,
    47.195,
    23_000_000,
    'Interacting spiral galaxies',
    true,
  ),
  object(
    'Sombrero (M104)',
    'galaxy',
    189.998,
    -11.623,
    29_000_000,
    'Edge-on galaxy with a bright core',
    true,
  ),
  object(
    'Virgo A (M87)',
    'galaxy',
    187.706,
    12.391,
    53_500_000,
    'Giant elliptical in the Virgo Cluster',
    true,
  ),
  object(
    'Coma Cluster',
    'galaxy',
    194.953,
    27.98,
    320_000_000,
    'Cluster of thousands of galaxies',
    true,
  ),
  object(
    'Cartwheel Galaxy',
    'galaxy',
    24.356,
    -33.716,
    500_000_000,
    'Ring galaxy',
    true,
  ),
]);

/** Every object with its galactic position (ly, Sun at the origin). */
export function cosmosWithPositions(list = COSMOS_OBJECTS) {
  return list.map((o) => {
    const [x, y, z] = galacticPosition(o.ra, o.dec, o.ly);
    return { ...o, x, y, z };
  });
}

/** Planet positions in AU, looking down on the ecliptic with the Sun at the origin. */
export function planetsNow(date = new Date()) {
  return [
    'Mercury',
    'Venus',
    'Earth',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune',
  ].map((name) => {
    const v = Astronomy.HelioVector(name, date);
    return { name, au: Math.hypot(v.x, v.y, v.z), x: v.x, y: v.y };
  });
}

function formatCount(years) {
  if (years < 1e6) return Math.round(years).toLocaleString('en-US');
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million`;
  return `${(years / 1e9).toFixed(2)} billion`;
}

/** A distance in light-years as readable text with its unit. */
export function formatDistance(ly) {
  if (!Number.isFinite(ly) || ly < 0) return 'unknown';
  const au = ly / LY_PER_AU;
  if (au < 0.01) return `${Math.round(au * AU_KM).toLocaleString('en-US')} km`;
  if (au < 1000) return `${au.toFixed(au < 10 ? 2 : 1)} AU`;
  if (ly < 1000) return `${ly.toFixed(ly < 100 ? 2 : 1)} light-years`;
  if (ly < 1_000_000)
    return `${Math.round(ly).toLocaleString('en-US')} light-years`;
  if (ly < 1_000_000_000)
    return `${(ly / 1e6).toFixed(ly < 1e7 ? 2 : 1)} million light-years`;
  return `${(ly / 1e9).toFixed(2)} billion light-years`;
}

/** How long light takes to arrive from that distance, in words. */
export function lightTravelTime(ly) {
  if (!Number.isFinite(ly) || ly <= 0) return 'unknown';
  const seconds = ly * 365.25 * 86400;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} light-hours`;
  if (ly < 2) return `${Math.round(ly * 365.25)} light-days`;
  return `light left it ${formatCount(ly)} years ago`;
}

/** Facts about the Sun's journey, with the values this view relies on. */
export function sunJourney() {
  return {
    orbitSpeedKms: SUN_ORBIT_SPEED_KMS,
    galacticYearMyr: GALACTIC_YEAR_MYR,
    distanceToCentreLy: SUN_TO_CENTRE_LY,
    orbitsSoFar: Math.round(4600 / GALACTIC_YEAR_MYR),
    localDriftKms: SUN_LOCAL_DRIFT_KMS,
    note:
      'The Sun has circled the galaxy about 20 times since it formed. ' +
      'Science does not predict a second Big Bang: the leading evidence says ' +
      'the universe keeps expanding. The Sun has about 5 billion years of ' +
      'fuel left, and Andromeda should merge with the Milky Way in about 4 to ' +
      '5 billion years.',
  };
}
