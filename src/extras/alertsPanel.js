import * as Cesium from 'cesium';
import {
  AURORA_URL,
  EONET_URL,
  FLARES_URL,
  GDACS_URL,
  KP_URL,
  USGS_URL,
  auroraPoints,
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

const getJson = (url) =>
  fetch(url).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(r.status)),
  );

const REFRESH_MS = 5 * 60 * 1000;

const STYLE = `
.atlas-panel{position:fixed;left:16px;bottom:16px;width:320px;max-height:55vh;display:flex;flex-direction:column;z-index:40;
  background:rgba(10,12,18,.88);color:#e6e8eb;border:1px solid rgba(120,160,255,.28);border-radius:10px;
  font:12px/1.4 'JetBrains Mono',ui-monospace,monospace;backdrop-filter:blur(8px)}
.atlas-panel.collapsed .atlas-body{display:none}
.atlas-head{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;user-select:none}
.atlas-head b{flex:1;letter-spacing:.08em}
.atlas-badge{background:#c0392b;color:#fff;border-radius:9px;padding:0 6px;font-size:11px}
.atlas-badge.zero{display:none}
.atlas-tabs{display:flex;border-top:1px solid rgba(255,255,255,.08)}
.atlas-tabs button{flex:1;background:none;border:0;color:#8b93a1;padding:6px;cursor:pointer;font:inherit}
.atlas-tabs button.on{color:#8fb0ff;box-shadow:inset 0 -2px #8fb0ff}
.atlas-list{overflow-y:auto;padding:4px 0;min-height:60px}
.atlas-row{display:flex;gap:8px;padding:6px 10px;cursor:pointer;align-items:flex-start}
.atlas-row:hover{background:rgba(255,255,255,.06)}
.atlas-row.hit{border-left:3px solid #e74c3c;padding-left:7px}
.atlas-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex:none}
.atlas-sub{color:#8b93a1;font-size:11px}
.atlas-row button{margin-left:auto;background:none;border:0;color:#8b93a1;cursor:pointer}
.atlas-form{display:grid;grid-template-columns:1fr 70px;gap:6px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.08)}
.atlas-form input,.atlas-form button{background:#101216;color:inherit;border:1px solid #2d333d;border-radius:5px;padding:5px 6px;font:inherit}
.atlas-form button{grid-column:1 / -1;background:#3b6df0;border-color:#3b6df0;cursor:pointer}
.atlas-empty{padding:10px;color:#8b93a1}
`;

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
 * Mount the Atlas Eye alerts and watchlist panel over a running globe.
 * Returns a dispose function.
 */
export function mountAlertsPanel(
  viewer,
  { storage = globalThis.localStorage } = {},
) {
  const store = createWatchlistStore(storage);
  const announced = new Set();
  const pins = viewer.entities.add(new Cesium.Entity({ id: 'atlas-alerts' }));
  const pinIds = [];
  let alerts = [];
  let space = { kp: null, flares: [] };
  let auroraOn = false;
  let auroraLayer = null;
  let tab = 'alerts';
  let disposed = false;
  let timer = 0;
  let firstLoad = true;

  const style = el('style', { textContent: STYLE });
  const badge = el('span', { className: 'atlas-badge zero', textContent: '0' });
  const head = el('div', { className: 'atlas-head' }, [
    el('b', { textContent: 'ALERTS' }),
    badge,
    el('span', { textContent: '▾' }),
  ]);
  const tabAlerts = el('button', { textContent: 'Alerts', className: 'on' });
  const tabWatch = el('button', { textContent: 'Watchlist' });
  const tabSpace = el('button', { textContent: 'Space' });
  const tabs = el('div', { className: 'atlas-tabs' }, [
    tabAlerts,
    tabWatch,
    tabSpace,
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
    const rect = viewer.camera.computeViewRectangle();
    if (rect) {
      return {
        lon: Cesium.Math.toDegrees(Cesium.Rectangle.center(rect).longitude),
        lat: Cesium.Math.toDegrees(Cesium.Rectangle.center(rect).latitude),
      };
    }
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
    form.style.display = tab === 'watch' ? '' : 'none';
    list.replaceChildren();

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
      return;
    }

    if (tab === 'alerts') {
      if (!alerts.length)
        list.append(
          el('div', {
            className: 'atlas-empty',
            textContent: 'Loading alerts…',
          }),
        );
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
    ]);
    if (disposed) return;
    const [usgs, eonet, gdacs, kp, flares] = results;
    if (kp.status === 'fulfilled') space.kp = latestKp(kp.value);
    if (flares.status === 'fulfilled') space.flares = parseFlares(flares.value);
    if (results.slice(0, 3).every((r) => r.status === 'rejected')) {
      // Keep whatever we already show; try again on the next tick.
      render();
      return;
    }
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
    redrawPins();
    render();
  }

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

  render();
  refresh();
  timer = setInterval(refresh, REFRESH_MS);

  return () => {
    disposed = true;
    clearInterval(timer);
    for (const id of pinIds) viewer.entities.removeById(id);
    viewer.entities.remove(pins);
    if (auroraLayer) viewer.scene.primitives.remove(auroraLayer);
    panel.remove();
    style.remove();
  };
}
