import * as Astronomy from 'astronomy-engine';

// Sun, Moon and the naked-eye planets plus Uranus and Neptune.
export const SKY_BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Eight-point compass label for an azimuth in degrees. */
export function compassLabel(azimuth) {
  return COMPASS[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8];
}

/**
 * Where each body is in the sky for an observer on the ground.
 * `up` means above the horizon. The Moon also reports its lit fraction.
 */
export function skyNow({ lat, lon }, date = new Date()) {
  const observer = new Astronomy.Observer(lat, lon, 0);
  return SKY_BODIES.map((name) => {
    const equator = Astronomy.Equator(name, date, observer, true, true);
    const horizon = Astronomy.Horizon(
      date,
      observer,
      equator.ra,
      equator.dec,
      'normal',
    );
    const row = {
      name,
      altitude: horizon.altitude,
      azimuth: horizon.azimuth,
      up: horizon.altitude > 0,
    };
    if (name === 'Moon') {
      row.litFraction = Astronomy.Illumination('Moon', date).phase_fraction;
    }
    return row;
  });
}
