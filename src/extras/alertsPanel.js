import * as Cesium from 'cesium';
import {
  AURORA_URL,
  EONET_URL,
  FLARES_URL,
  GDACS_URL,
  KP_URL,
  USGS_URL,
  auroraPoints,
  createFeedCache,
  createWatchlistStore,
  latestKp,
  matchWatch,
  mergeAlerts,
  newWatchHits,
  parseEonet,
  parseFlares,
  parseGdacs,
  parseUsgs,
} from './alertsCore.js';
import { compassLabel, skyNow } from './skyCore.js';
import { STYLE, skeletonRows } from './theme.js';

const getJson = (url) =>
  fetch(url).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(r.status)),
  );

const REFRESH_MS = 5 * 60 * 1000;

const KIND_COLOR = {
  quake: '#f1c40f',
  wildfires: '#e67e22',
  volcanoes: '#e74c3c',
  severeStorms: '#5dade2',
  floods: '#3498db',
  drought: '#a0522d',
};
const colorFor = (kind) => KIND_COLOR[kind] || '#95a5a6';

function timeAgo(ms) {
  const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/**
 * Mount the Terranet alerts and watchlist panel over a running globe.
 * Returns a dispose function.
 */
export function mountAlertsPanel(
  viewer,
  { storage = globalThis.localStorage, extraTabs = [] } = {},
) {
  const store = createWatchlistStore(storage);
  const cache = createFeedCache(storage);
  const announced = new Set();
  // Set while the panel shows saved data because every live feed failed.
  let staleSince = null;
  const pins = viewer.entities.add(new Cesium.Entity({ id: 'atlas-alerts' }));
  const pinIds = [];
  let alerts = [];
  let space = { kp: null, flares: [], planets: [], totalPlanets: null };
  let settled = false; // true once the first refresh has finished
  let auroraOn = false;
  let auroraLayer = null;
  let tab = 'alerts';
  let disposed = false;
  let timer = 0;
  let firstLoad = true;

  const style = el('style', { textContent: STYLE });
  const badge = el('span', { className: 'atlas-badge zero', textContent: '0' });
  const closeX = el('button', {
    className: 'atlas-x',
    textContent: '✕',
    title: 'Close Alerts',
    type: 'button',
  });
  closeX.setAttribute('aria-label', 'Close Alerts');
  const head = el('div', { className: 'atlas-head' }, [
    el('b', { textContent: 'ALERTS' }),
    badge,
    el('span', { textContent: '▾' }),
    closeX,
  ]);
  const tabAlerts = el('button', { textContent: 'Alerts', className: 'on' });
  const tabWatch = el('button', { textContent: 'Watchlist' });
  const tabSpace = el('button', { textContent: 'Space' });
  const extraButtons = extraTabs.map((t) => {
    const button = el('button', { textContent: t.label });
    button.onclick = () => {
      tab = t.id;
      render();
    };
    return button;
  });
  const tabs = el('div', { className: 'atlas-tabs' }, [
    tabAlerts,
    tabWatch,
    tabSpace,
    ...extraButtons,
  ]);
  const list = el('div', { className: 'atlas-list' });
  const nameInput = el('input', { placeholder: 'Name (uses current view)' });
  const radiusInput = el('input', {
    placeholder: 'km',
    type: 'number',
    value: '500',
  });
  const addBtn = el('button', { textContent: 'Watch this view' });
  const form = el('div', { className: 'atlas-form' }, [
    nameInput,
    radiusInput,
    addBtn,
  ]);
  const body = el('div', { className: 'atlas-body' }, [tabs, list, form]);
  const panel = el('div', { className: 'atlas-panel collapsed' }, [head, body]);
  document.head.append(style);
  document.body.append(panel);

  const flyTo = (lon, lat, height = 1_800_000) =>
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
      duration: 2,
    });

  function currentViewCenter() {
    // The point on the globe under the middle of the screen.
    const canvas = viewer.scene.canvas;
    const hit = viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
      viewer.scene.globe.ellipsoid,
    );
    if (hit) {
      const point = Cesium.Cartographic.fromCartesian(hit);
      return {
        lon: Cesium.Math.toDegrees(point.longitude),
        lat: Cesium.Math.toDegrees(point.latitude),
      };
    }
    // Looking at the sky or space: use the spot beneath the camera.
    const carto = viewer.camera.positionCartographic;
    return {
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
    };
  }

  function redrawPins() {
    for (const id of pinIds.splice(0)) viewer.entities.removeById(id);
    for (const a of alerts) {
      viewer.entities.add({
        id: `atlas-pin:${a.id}`,
        name: a.title,
        position: Cesium.Cartesian3.fromDegrees(a.lon, a.lat),
        point: {
          pixelSize:
            a.id.startsWith('usgs:') && a.severity >= 4
              ? 6 + (a.severity - 4) * 3
              : 8,
          color: Cesium.Color.fromCssColorString(colorFor(a.kind)).withAlpha(
            0.85,
          ),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      pinIds.push(`atlas-pin:${a.id}`);
    }
  }

  function render() {
    const watch = store.list();
    const hits = alerts.filter((a) => matchWatch(a, watch));
    badge.textContent = String(hits.length);
    badge.classList.toggle('zero', hits.length === 0);
    tabAlerts.classList.toggle('on', tab === 'alerts');
    tabWatch.classList.toggle('on', tab === 'watch');
    tabSpace.classList.toggle('on', tab === 'space');
    extraTabs.forEach((t, i) =>
      extraButtons[i].classList.toggle('on', tab === t.id),
    );
    form.style.display = tab === 'watch' ? '' : 'none';
    list.replaceChildren();

    if (staleSince !== null && tab !== 'watch') {
      list.append(
        el('div', {
          className: 'atlas-banner',
          textContent: `Offline: showing data saved ${timeAgo(staleSince)}.`,
        }),
      );
    }

    const extra = extraTabs.find((t) => t.id === tab);
    if (extra) {
      extra.render(list, {
        el,
        flyTo,
        getSpace: () => space,
        rerender: render,
      });
      return;
    }

    if (tab === 'space') {
      const kp = space.kp;
      list.append(
        el('div', { className: 'atlas-row' }, [
          el('div', {}, [
            el('div', {
              textContent: kp
                ? `Kp ${kp.kp.toFixed(1)} · ${kp.level}`
                : 'Kp index loading…',
            }),
            el('div', {
              className: 'atlas-sub',
              textContent: kp ? `NOAA SWPC · ${timeAgo(kp.time)}` : 'NOAA SWPC',
            }),
          ]),
        ]),
      );
      const toggle = el('button', {
        textContent: auroraOn ? 'Hide aurora overlay' : 'Show aurora overlay',
      });
      toggle.onclick = () => setAurora(!auroraOn);
      list.append(el('div', { className: 'atlas-form' }, [toggle]));
      const here = currentViewCenter();
      list.append(
        el('div', {
          className: 'atlas-sub',
          textContent: `Sky above ${here.lat.toFixed(1)}, ${here.lon.toFixed(1)} (globe centre)`,
        }),
      );
      for (const b of skyNow(here)) {
        const detail = b.up
          ? `${Math.round(b.altitude)}° up, ${compassLabel(b.azimuth)}`
          : 'below the horizon';
        const moon =
          b.litFraction === undefined
            ? ''
            : ` · ${Math.round(b.litFraction * 100)}% lit`;
        const row = el('div', { className: 'atlas-row' }, [
          el('span', { className: 'atlas-dot' }),
          el('div', {}, [
            el('div', { textContent: b.name }),
            el('div', { className: 'atlas-sub', textContent: detail + moon }),
          ]),
        ]);
        row.firstChild.style.background = b.up ? '#f1c40f' : '#3d4452';
        list.append(row);
      }
      list.append(
        el('div', {
          className: 'atlas-sub',
          textContent: 'Recent solar flares',
        }),
      );
      if (!space.flares.length)
        list.append(
          el('div', {
            className: 'atlas-empty',
            textContent: 'No flare data.',
          }),
        );
      for (const f of space.flares) {
        const strong = f.strength >= 1e-5;
        const row = el(
          'div',
          { className: `atlas-row${strong ? ' hit' : ''}` },
          [
            el('div', {}, [
              el('div', { textContent: `${f.cls} flare` }),
              el('div', {
                className: 'atlas-sub',
                textContent: `${timeAgo(f.time)}${strong ? ' · M/X class' : ''}`,
              }),
            ]),
          ],
        );
        list.append(row);
      }
      list.append(
        el('div', {
          className: 'atlas-sub',
          textContent: space.totalPlanets
            ? `Newest exoplanets (${space.totalPlanets.toLocaleString()} confirmed)`
            : 'Newest exoplanets',
        }),
      );
      if (!space.planets.length && !settled)
        list.append(...skeletonRows(el, 3));
      else if (!space.planets.length)
        list.append(
          el('div', {
            className: 'atlas-empty',
            textContent:
              'Exoplanet feed unavailable. It needs the local server (npm run dev).',
          }),
        );
      for (const p of space.planets) {
        const facts = [
          p.radiusEarth ? `${p.radiusEarth.toFixed(1)}× Earth wide` : null,
          p.tempK ? `${Math.round(p.tempK)} K` : null,
          p.distanceLy
            ? `${Math.round(p.distanceLy).toLocaleString()} ly away`
            : null,
          p.method,
        ].filter(Boolean);
        list.append(
          el('div', { className: 'atlas-row' }, [
            el('div', {}, [
              el('div', {
                textContent: `${p.name}${p.discoveredYear ? ` (${p.discoveredYear})` : ''}`,
              }),
              el('div', {
                className: 'atlas-sub',
                textContent: facts.join(' · ') || 'No measurements yet',
              }),
            ]),
          ]),
        );
      }
      return;
    }

    if (tab === 'alerts') {
      if (!alerts.length) list.append(...skeletonRows(el, 6));
      for (const a of alerts) {
        const place = matchWatch(a, watch);
        const row = el(
          'div',
          { className: `atlas-row${place ? ' hit' : ''}` },
          [
            el('span', { className: 'atlas-dot' }),
            el('div', {}, [
              el('div', { textContent: a.title }),
              el('div', {
                className: 'atlas-sub',
                textContent: `${timeAgo(a.time)}${place ? ` · near ${place.name}` : ''}`,
              }),
            ]),
          ],
        );
        row.firstChild.style.background = colorFor(a.kind);
        row.onclick = () => flyTo(a.lon, a.lat);
        list.append(row);
      }
      return;
    }

    if (!watch.length) {
      list.append(
        el('div', {
          className: 'atlas-empty',
          textContent:
            'No watched places. Move the globe, name the view and add it. You get an alert when something happens inside its radius.',
        }),
      );
    }
    for (const p of watch) {
      const remove = el('button', { textContent: '✕', title: 'Remove' });
      remove.onclick = (event) => {
        event.stopPropagation();
        store.remove(p.id);
        render();
      };
      const row = el('div', { className: 'atlas-row' }, [
        el('div', {}, [
          el('div', { textContent: p.name }),
          el('div', {
            className: 'atlas-sub',
            textContent: `${p.radiusKm} km radius`,
          }),
        ]),
        remove,
      ]);
      row.onclick = () => flyTo(p.lon, p.lat);
      list.append(row);
    }
  }

  function notify(hits) {
    for (const { alert, place } of hits) {
      announced.add(alert.id);
      try {
        if (globalThis.Notification?.permission === 'granted') {
          new Notification(`Near ${place.name}`, { body: alert.title });
        }
      } catch {
        // Notifications are optional.
      }
    }
  }

  async function setAurora(on) {
    auroraOn = on;
    if (!on) {
      if (auroraLayer) auroraLayer.show = false;
      render();
      return;
    }
    try {
      if (!auroraLayer) {
        const points = auroraPoints(await getJson(AURORA_URL));
        auroraLayer = viewer.scene.primitives.add(
          new Cesium.PointPrimitiveCollection(),
        );
        for (const p of points) {
          auroraLayer.add({
            position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 100_000),
            pixelSize: 5,
            color: Cesium.Color.fromHsl(
              0.33 - Math.min(p.value, 80) / 400,
              1,
              0.5,
              Math.min(0.85, 0.15 + p.value / 100),
            ),
          });
        }
      }
      auroraLayer.show = true;
    } catch {
      auroraOn = false;
    }
    render();
  }

  async function refresh() {
    const results = await Promise.allSettled([
      getJson(USGS_URL),
      getJson(EONET_URL),
      getJson(GDACS_URL),
      getJson(KP_URL),
      getJson(FLARES_URL),
      // Served by this app's own server; absent when the page is hosted statically.
      getJson('/api/exoplanets'),
    ]);
    if (disposed) return;
    settled = true;
    const [usgs, eonet, gdacs, kp, flares, planets] = results;
    if (kp.status === 'fulfilled') space.kp = latestKp(kp.value);
    if (flares.status === 'fulfilled') space.flares = parseFlares(flares.value);
    if (
      planets.status === 'fulfilled' &&
      Array.isArray(planets.value?.planets)
    ) {
      space.planets = planets.value.planets;
      space.totalPlanets = planets.value.totalConfirmed ?? null;
    }
    if (results.slice(0, 3).every((r) => r.status === 'rejected')) {
      // Keep whatever we already show (live or saved); try again on the next tick.
      if (alerts.length && staleSince === null) staleSince = lastGoodAt;
      render();
      return;
    }
    staleSince = null;
    const ok = (r, parse) => (r.status === 'fulfilled' ? parse(r.value) : []);
    alerts = mergeAlerts(
      ok(usgs, parseUsgs),
      ok(eonet, parseEonet),
      ok(gdacs, parseGdacs),
    );
    const hits = newWatchHits(alerts, store.list(), announced);
    // The first load only records what already exists, so reopening the app
    // does not replay every old event as a notification.
    if (firstLoad) hits.forEach(({ alert }) => announced.add(alert.id));
    else notify(hits);
    firstLoad = false;
    lastGoodAt = Date.now();
    cache.save({ alerts, space });
    redrawPins();
    render();
  }

  closeX.onclick = (event) => {
    event.stopPropagation();
    panel.classList.add('collapsed');
  };
  head.onclick = async () => {
    panel.classList.toggle('collapsed');
    if (
      !panel.classList.contains('collapsed') &&
      globalThis.Notification?.permission === 'default'
    ) {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore: alerts still show in the panel.
      }
    }
  };
  tabAlerts.onclick = () => {
    tab = 'alerts';
    render();
  };
  tabWatch.onclick = () => {
    tab = 'watch';
    render();
  };
  tabSpace.onclick = () => {
    tab = 'space';
    render();
  };
  addBtn.onclick = () => {
    const { lon, lat } = currentViewCenter();
    store.add({
      name: nameInput.value || `View ${lat.toFixed(1)}, ${lon.toFixed(1)}`,
      lon,
      lat,
      radiusKm: radiusInput.value,
    });
    nameInput.value = '';
    render();
  };

  // Show the last saved data straight away; the first refresh replaces it.
  let lastGoodAt = Date.now();
  const saved = cache.load();
  if (saved?.alerts.length) {
    alerts = saved.alerts;
    space = saved.space;
    lastGoodAt = saved.savedAt;
    alerts.forEach((a) => announced.add(a.id));
    redrawPins();
  }

  render();
  refresh();
  timer = setInterval(refresh, REFRESH_MS);
  // Planets move, so keep the Space tab current while it is open.
  const skyTimer = setInterval(() => {
    if (tab === 'space' && !panel.classList.contains('collapsed')) render();
  }, 60_000);
  const onOnline = () => refresh();
  globalThis.addEventListener?.('online', onOnline);

  return () => {
    disposed = true;
    clearInterval(timer);
    clearInterval(skyTimer);
    globalThis.removeEventListener?.('online', onOnline);
    for (const id of pinIds) viewer.entities.removeById(id);
    viewer.entities.remove(pins);
    if (auroraLayer) viewer.scene.primitives.remove(auroraLayer);
    panel.remove();
    style.remove();
  };
}
