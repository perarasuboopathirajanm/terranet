import * as Cesium from 'cesium';
import {
  BLACK_HOLES,
  STARS,
  directionFor,
  filterByName,
  parseTle,
  satellitePosition,
  solarSystemNow,
} from './exploreCore.js';
import { skeletonRows } from './theme.js';
import { imageForSatellite } from './satelliteImages.js';
import { openCosmos } from './cosmosView.js';
import { groupByCountry } from './cameraCountries.js';
import { MISSIONS, MISSIONS_AS_OF, missionCounts } from './missionsCore.js';

const CATEGORIES = [
  { id: 'cams', label: 'Cameras' },
  { id: 'missions', label: 'Missions' },
  { id: 'cosmos', label: 'Cosmos' },
  { id: 'solar', label: 'Solar system' },
  { id: 'stars', label: 'Stars' },
  { id: 'holes', label: 'Black holes' },
  { id: 'planets', label: 'New planets' },
  { id: 'sats', label: 'Satellites' },
];

// How far from the centre of Earth the camera sits when looking at the sky.
const SKY_VIEW_DISTANCE_M = 35_000_000;
const SATELLITE_GROUP = 'stations';

/**
 * The Explore tab: search the sky and fly the camera to it. Stars, black
 * holes and exoplanet host stars are looked at from space (the camera faces
 * the object's real direction, so the starfield lines up). Satellites are
 * approached from just above them.
 */
export function createExploreTab(viewer, { dataManager = null } = {}) {
  let category = 'solar';
  let query = '';
  let satellites = null; // null while loading, [] when unavailable
  let satellitesRequested = false;
  let cameraRows = null; // null while loading, [] when unavailable
  let camerasRequested = false;
  let reticle = null;
  let reticleTimer = 0;
  let card = null;
  let ctx = null;

  const rowsBox = document.createElement('div');
  const search = document.createElement('input');
  search.className = 'atlas-search';
  search.placeholder = 'Search by name';
  search.oninput = () => {
    query = search.value;
    fillRows();
  };
  const chips = document.createElement('div');
  chips.className = 'atlas-chips';

  function showReticle(label) {
    reticle?.remove();
    clearTimeout(reticleTimer);
    reticle = document.createElement('div');
    reticle.className = 'atlas-reticle';
    const text = document.createElement('span');
    text.textContent = label;
    reticle.append(text);
    document.body.append(reticle);
    reticleTimer = setTimeout(() => reticle?.remove(), 12_000);
  }

  function lookAtSky(object, label) {
    const time = viewer.clock.currentTime;
    const rotation =
      Cesium.Transforms.computeIcrfToFixedMatrix(time) ??
      Cesium.Transforms.computeTemeToPseudoFixedMatrix(time);
    const [x, y, z] = directionFor(object);
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Matrix3.multiplyByVector(
        rotation,
        new Cesium.Cartesian3(x, y, z),
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    // "Up" is celestial north projected onto the view plane.
    const north = Cesium.Cartesian3.UNIT_Z;
    const along = Cesium.Cartesian3.dot(north, direction);
    let up = Cesium.Cartesian3.subtract(
      north,
      Cesium.Cartesian3.multiplyByScalar(
        direction,
        along,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );
    if (Cesium.Cartesian3.magnitude(up) < 1e-6)
      up = Cesium.Cartesian3.UNIT_X.clone();
    Cesium.Cartesian3.normalize(up, up);
    reticle?.remove();
    // Sit on the object's side of Earth, facing away from it, so the planet is behind the camera.
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.multiplyByScalar(
        direction,
        SKY_VIEW_DISTANCE_M,
        new Cesium.Cartesian3(),
      ),
      orientation: { direction, up },
      duration: 3,
      complete: () => showReticle(label),
    });
  }

  function showCard(name) {
    card?.remove();
    card = null;
    const image = imageForSatellite(name);
    if (!image) return;
    card = document.createElement('div');
    card.className = 'atlas-card';
    const img = document.createElement('img');
    img.src = image.src;
    img.alt = name;
    const label = document.createElement('div');
    label.className = 'atlas-card-label';
    label.textContent = `${name} - ${image.caption}`;
    const close = document.createElement('button');
    close.textContent = 'x';
    close.setAttribute('aria-label', 'Close picture');
    close.onclick = () => {
      card?.remove();
      card = null;
    };
    card.append(img, label, close);
    document.body.append(card);
  }

  function flyToSatellite(entry) {
    const pos = satellitePosition(entry);
    if (!pos) return;
    const target = Cesium.Cartesian3.fromDegrees(
      pos.lon,
      pos.lat,
      pos.altKm * 1000,
    );
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 500), {
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-35),
        120_000,
      ),
      duration: 3,
      complete: () => {
        showReticle(entry.name);
        showCard(entry.name);
      },
    });
  }

  function loadSatellites() {
    if (satellitesRequested) return;
    satellitesRequested = true;
    fetch(`/api/celestrak/${SATELLITE_GROUP}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
      .then((text) => {
        satellites = parseTle(text);
      })
      .catch(() => {
        satellites = [];
      })
      .finally(() => {
        if (category === 'sats') fillRows();
      });
  }

  function loadCameras() {
    if (camerasRequested) return;
    camerasRequested = true;
    fetch('/api/cctv/sources')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((payload) => {
        cameraRows = groupByCountry(payload?.sources);
      })
      .catch(() => {
        cameraRows = [];
      })
      .finally(() => {
        if (category === 'cams') fillRows();
      });
  }

  function flyToCountry(row) {
    if (dataManager) {
      Promise.resolve(
        dataManager.setEnabled('cctv', true, { origin: 'user' }),
      ).catch(() => {});
    }
    if (!row.hasBox) return;
    const pad = Math.max(0.5, (row.east - row.west) * 0.15);
    viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        Math.max(-180, row.west - pad),
        Math.max(-90, row.south - pad),
        Math.min(180, row.east + pad),
        Math.min(90, row.north + pad),
      ),
      duration: 3,
    });
  }

  function skyRow(object, detail, onGo) {
    const row = document.createElement('div');
    row.className = 'atlas-row';
    const body = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = object.name;
    const sub = document.createElement('div');
    sub.className = 'atlas-sub';
    sub.textContent = detail;
    body.append(title, sub);
    const image = imageForSatellite(object.name);
    if (image) {
      const thumb = document.createElement('img');
      thumb.className = 'atlas-thumb';
      thumb.src = image.src;
      thumb.alt = '';
      thumb.loading = 'lazy';
      row.append(thumb);
    }
    row.append(body);
    row.onclick = onGo;
    return row;
  }

  function fillRows() {
    rowsBox.replaceChildren();
    const empty = (text) => {
      const div = document.createElement('div');
      div.className = 'atlas-empty';
      div.textContent = text;
      rowsBox.append(div);
    };

    if (category === 'cams') {
      if (cameraRows === null) {
        rowsBox.append(...skeletonRows(ctx.el, 6));
        return;
      }
      const list = filterByName(
        cameraRows.map((r) => ({ ...r, name: r.country })),
        query,
      );
      if (!list.length) {
        return empty(
          cameraRows.length
            ? 'Nothing matches.'
            : 'Camera list unavailable right now.',
        );
      }
      for (const row of list) {
        rowsBox.append(
          skyRow(row, `${row.count.toLocaleString('en-US')} cameras`, () =>
            flyToCountry(row),
          ),
        );
      }
      return;
    }

    if (category === 'missions') {
      const note = document.createElement('div');
      note.className = 'atlas-empty';
      note.textContent = `Spacecraft at the Moon, Mars and beyond. Hand-kept list as of ${MISSIONS_AS_OF}; open the Cosmos map and click a planet for its own list.`;
      rowsBox.append(note);
      const counts = missionCounts()
        .map((c) => `${c.target} ${c.count}`)
        .join(' · ');
      const total = document.createElement('div');
      total.className = 'atlas-sub';
      total.textContent = `Working or on the way: ${counts}`;
      rowsBox.append(total);
      const list = filterByName(MISSIONS, query);
      if (!list.length) return empty('Nothing matches.');
      for (const m of list) {
        const detail = [
          `${m.target}, ${m.role}`,
          `${m.agency}, ${m.launched}`,
          m.status,
          m.note,
        ]
          .filter(Boolean)
          .join(' · ');
        rowsBox.append(skyRow(m, detail, () => openCosmos()));
      }
      return;
    }

    if (category === 'cosmos') {
      const open = document.createElement('button');
      open.className = 'atlas-open';
      open.textContent = 'Open the Cosmos map';
      open.onclick = () => openCosmos();
      const text = document.createElement('div');
      text.className = 'atlas-empty';
      text.textContent =
        'See where we are: the solar system, nearby stars, the Milky Way, black holes and nearby galaxies, with distances from the Sun. Scroll to zoom, drag to move.';
      rowsBox.append(text, open);
      return;
    }

    if (category === 'solar') {
      const list = filterByName(solarSystemNow(), query);
      if (!list.length) return empty('Nothing matches.');
      for (const o of list) {
        rowsBox.append(skyRow(o, o.note, () => lookAtSky(o, o.name)));
      }
      return;
    }

    if (category === 'stars' || category === 'holes') {
      const list = filterByName(
        category === 'stars' ? STARS : BLACK_HOLES,
        query,
      );
      if (!list.length) return empty('Nothing matches.');
      for (const o of list) {
        rowsBox.append(skyRow(o, o.note, () => lookAtSky(o, o.name)));
      }
      return;
    }

    if (category === 'planets') {
      const planets = filterByName(ctx.getSpace().planets ?? [], query).filter(
        (p) => Number.isFinite(p.raDeg) && Number.isFinite(p.decDeg),
      );
      if (!planets.length) {
        return empty(
          'No planets yet. This list fills from the Space tab feed (needs the local server).',
        );
      }
      for (const p of planets) {
        const facts = [
          p.discoveredYear ? `found ${p.discoveredYear}` : null,
          p.distanceLy
            ? `${Math.round(p.distanceLy).toLocaleString()} ly away`
            : null,
          p.star ? `orbits ${p.star}` : null,
        ].filter(Boolean);
        rowsBox.append(
          skyRow(p, facts.join(' · '), () =>
            lookAtSky({ ra: p.raDeg, dec: p.decDeg }, `${p.name} (host star)`),
          ),
        );
      }
      return;
    }

    if (satellites === null) {
      rowsBox.append(...skeletonRows(ctx.el, 5));
      return;
    }
    const list = filterByName(satellites, query);
    if (!list.length) {
      return empty(
        satellites.length
          ? 'Nothing matches.'
          : 'Satellite data unavailable (needs the local server).',
      );
    }
    for (const entry of list) {
      rowsBox.append(
        skyRow(entry, 'Space station or crewed craft', () =>
          flyToSatellite(entry),
        ),
      );
    }
  }

  function render(list, context) {
    ctx = context;
    chips.replaceChildren(
      ...CATEGORIES.map((c) => {
        const chip = document.createElement('button');
        chip.className = `atlas-chip${c.id === category ? ' on' : ''}`;
        chip.textContent = c.label;
        chip.onclick = () => {
          category = c.id;
          query = '';
          search.value = '';
          if (category === 'sats') loadSatellites();
          if (category === 'cams') loadCameras();
          render(list, context);
        };
        return chip;
      }),
    );
    if (category === 'sats') loadSatellites();
    if (category === 'cams') loadCameras();
    list.append(chips, search, rowsBox);
    fillRows();
  }

  return {
    id: 'explore',
    label: 'Explore',
    render,
    dispose() {
      clearTimeout(reticleTimer);
      reticle?.remove();
      card?.remove();
    },
  };
}
