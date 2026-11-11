// Spacecraft studying the Moon, other planets and the Sun. A hand-kept list
// (no free live feed exists), checked against what was publicly known in
// mid-2026. Statuses change, so each row carries a status and the list a date.
export const MISSIONS_AS_OF = '2026-06';

// status: active | cruise (on the way) | lost (contact lost) | ended
const m = (name, agency, launched, target, role, status, note = '') => ({
  name,
  agency,
  launched,
  target,
  role,
  status,
  note,
});

export const MISSIONS = Object.freeze([
  // Moon
  m(
    'Lunar Reconnaissance Orbiter',
    'NASA',
    2009,
    'Moon',
    'Orbiter',
    'active',
    'Maps the Moon from polar orbit',
  ),
  m('Chandrayaan-2 orbiter', 'ISRO', 2019, 'Moon', 'Orbiter', 'active'),
  m('Danuri (KPLO)', 'KARI, South Korea', 2022, 'Moon', 'Orbiter', 'active'),
  m(
    'Queqiao-2',
    'CNSA, China',
    2024,
    'Moon',
    'Relay satellite',
    'active',
    'Links Earth with the far side',
  ),
  m(
    'ARTEMIS P1',
    'NASA',
    2007,
    'Moon',
    'Orbiter',
    'active',
    'Reused THEMIS probe',
  ),
  m(
    'ARTEMIS P2',
    'NASA',
    2007,
    'Moon',
    'Orbiter',
    'active',
    'Reused THEMIS probe',
  ),
  // Mars
  m(
    'Mars Odyssey',
    'NASA',
    2001,
    'Mars',
    'Orbiter',
    'active',
    'Longest-serving Mars spacecraft',
  ),
  m('Mars Express', 'ESA', 2003, 'Mars', 'Orbiter', 'active'),
  m('Mars Reconnaissance Orbiter', 'NASA', 2005, 'Mars', 'Orbiter', 'active'),
  m(
    'MAVEN',
    'NASA',
    2013,
    'Mars',
    'Orbiter',
    'lost',
    'Contact lost in December 2025 (reported); check for updates',
  ),
  m(
    'ExoMars Trace Gas Orbiter',
    'ESA / Roscosmos',
    2016,
    'Mars',
    'Orbiter',
    'active',
  ),
  m('Tianwen-1 orbiter', 'CNSA, China', 2020, 'Mars', 'Orbiter', 'active'),
  m('Hope (Emirates Mars Mission)', 'UAE', 2020, 'Mars', 'Orbiter', 'active'),
  m(
    'Curiosity',
    'NASA',
    2011,
    'Mars',
    'Rover',
    'active',
    'On the surface since 2012',
  ),
  m(
    'Perseverance',
    'NASA',
    2020,
    'Mars',
    'Rover',
    'active',
    'Collects samples in Jezero crater',
  ),
  // Mercury and Venus
  m(
    'BepiColombo',
    'ESA / JAXA',
    2018,
    'Mercury',
    'Orbiter',
    'cruise',
    'Due to enter Mercury orbit in November 2026',
  ),
  m(
    'Akatsuki',
    'JAXA',
    2010,
    'Venus',
    'Orbiter',
    'ended',
    'Contact lost in 2024',
  ),
  // Jupiter
  m(
    'Juno',
    'NASA',
    2011,
    'Jupiter',
    'Orbiter',
    'active',
    'Extended mission; check its current status',
  ),
  m(
    'Europa Clipper',
    'NASA',
    2024,
    'Jupiter',
    'Orbiter',
    'cruise',
    'Arrives around 2030',
  ),
  m(
    'JUICE',
    'ESA',
    2023,
    'Jupiter',
    'Orbiter',
    'cruise',
    'Arrives around 2031',
  ),
  // Sun
  m(
    'Parker Solar Probe',
    'NASA',
    2018,
    'Sun',
    'Probe',
    'active',
    'Closest spacecraft to the Sun',
  ),
  m('Solar Orbiter', 'ESA / NASA', 2020, 'Sun', 'Orbiter', 'active'),
  m('SOHO', 'ESA / NASA', 1995, 'Sun', 'Observatory at L1', 'active'),
  m('Solar Dynamics Observatory', 'NASA', 2010, 'Sun', 'Observatory', 'active'),
  m('STEREO-A', 'NASA', 2006, 'Sun', 'Observatory', 'active'),
  m('Aditya-L1', 'ISRO', 2023, 'Sun', 'Observatory at L1', 'active'),
  m('PUNCH', 'NASA', 2025, 'Sun', 'Four small satellites', 'active'),
  // Asteroids and beyond
  m(
    'Lucy',
    'NASA',
    2021,
    'Asteroids',
    'Probe',
    'cruise',
    'Visiting the Jupiter Trojans',
  ),
  m(
    'Psyche',
    'NASA',
    2023,
    'Asteroids',
    'Probe',
    'cruise',
    'Arrives at asteroid Psyche around 2029',
  ),
  m(
    'Hera',
    'ESA',
    2024,
    'Asteroids',
    'Probe',
    'cruise',
    'Due at the Didymos system in late 2026',
  ),
  m(
    'Voyager 1',
    'NASA',
    1977,
    'Interstellar space',
    'Probe',
    'active',
    'The most distant human-made object',
  ),
  m('Voyager 2', 'NASA', 1977, 'Interstellar space', 'Probe', 'active'),
  m(
    'New Horizons',
    'NASA',
    2006,
    'Interstellar space',
    'Probe',
    'active',
    'Passed Pluto in 2015',
  ),
]);

const COUNTED = new Set(['active', 'cruise']);

/** Counts per target of spacecraft that are working or on their way. */
export function missionCounts(list = MISSIONS) {
  const counts = new Map();
  for (const item of list) {
    if (!COUNTED.has(item.status)) continue;
    counts.set(item.target, (counts.get(item.target) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([target, count]) => ({ target, count }))
    .sort((a, b) => b.count - a.count || a.target.localeCompare(b.target));
}

/** Missions for one target (case-insensitive), in list order. */
export function missionsFor(target, list = MISSIONS) {
  const t = String(target ?? '').toLowerCase();
  return list.filter((item) => item.target.toLowerCase() === t);
}

/** One line such as "Mars: 6 working, 1 lost". */
export function targetSummary(target, list = MISSIONS) {
  const rows = missionsFor(target, list);
  if (!rows.length) return `${target}: no spacecraft listed`;
  const by = (s) => rows.filter((r) => r.status === s).length;
  const parts = [];
  if (by('active')) parts.push(`${by('active')} working`);
  if (by('cruise')) parts.push(`${by('cruise')} on the way`);
  if (by('lost')) parts.push(`${by('lost')} lost`);
  if (by('ended')) parts.push(`${by('ended')} ended`);
  return `${target}: ${parts.join(', ')}`;
}
