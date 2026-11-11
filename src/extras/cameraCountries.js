// Which country each camera network belongs to, keyed by the camera's
// `sourceKind` (a network id) with a fallback on the pack name.
const NETWORK_COUNTRY = Object.freeze({
  'a22-opendatahub': 'Italy',
  'austin-open-data': 'United States',
  'calgary-open-data': 'Canada',
  'caltrans-open-data': 'United States',
  'catalonia-open-data': 'Spain',
  'deldot-open-data': 'United States',
  'drivebc-open-data': 'Canada',
  'eismoinfo-public': 'Lithuania',
  'fintraffic-open-data': 'Finland',
  'fl511-open-data': 'United States',
  'hk-td-open-data': 'Hong Kong',
  'houston-transtar': 'United States',
  'iceland-vegagerdin': 'Iceland',
  'kingcounty-open-data': 'United States',
  'mlit-river': 'Japan',
  'nsw-livetraffic': 'Australia',
  'nyc-dot-tmc': 'United States',
  'ontario-511-open-data': 'Canada',
  'ottawa-traffic': 'Canada',
  'quebec-511-browser': 'Canada',
  'quebec-montreal-osm': 'Canada',
  'quebec-webcam-link': 'Canada',
  'taiwan-highway-motc': 'Taiwan',
  'tallinn-ristmikud': 'Estonia',
  'tarktee-datex': 'Estonia',
  'tfl-open-data': 'United Kingdom',
  'toronto-rescu-open-data': 'Canada',
  'tripcheck-odot': 'United States',
  'tw-freeway-motc': 'Taiwan',
  'txdot-its': 'United States',
  'vegvesen-datex': 'Norway',
  'wsdot-open-data': 'United States',
});

/** The country a camera record belongs to, or 'Other' when its network is unknown. */
export function countryOf(camera) {
  return NETWORK_COUNTRY[camera?.sourceKind] ?? 'Other';
}

/**
 * Group camera records by country: count, bounding box and centre, biggest
 * first. Records without a usable position still count but leave the box out.
 */
export function groupByCountry(cameras) {
  const map = new Map();
  for (const camera of Array.isArray(cameras) ? cameras : []) {
    const country = countryOf(camera);
    let row = map.get(country);
    if (!row) {
      row = {
        country,
        count: 0,
        west: Infinity,
        south: Infinity,
        east: -Infinity,
        north: -Infinity,
      };
      map.set(country, row);
    }
    row.count += 1;
    const { lat, lon } = camera ?? {};
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      row.west = Math.min(row.west, lon);
      row.east = Math.max(row.east, lon);
      row.south = Math.min(row.south, lat);
      row.north = Math.max(row.north, lat);
    }
  }
  return [...map.values()]
    .map((row) => ({ ...row, hasBox: row.west <= row.east }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}
