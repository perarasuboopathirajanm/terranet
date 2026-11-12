import {
  COSMOS_OBJECTS,
  KM_PER_LY,
  LY_PER_AU,
  MILKY_WAY_RADIUS_LY,
  SUN_TO_CENTRE_LY,
  cosmosWithPositions,
  formatDistance,
  lightTravelTime,
  sunJourney,
} from './cosmosCore.js';
import { BODY_INFO, bodyFacts, solarBodies } from './solarBodies.js';
import { cosmosPhoto } from './cosmosPhotos.js';
import {
  drawStarGlow,
  drawStarPortrait,
  NO_PHOTO_NOTE,
  STAR_PHOTOS,
  sizeLine,
  starLook,
} from './starLook.js';
import { MISSIONS_AS_OF, missionsFor, targetSummary } from './missionsCore.js';

const DAY_MS = 86_400_000;
const SPEEDS = [
  { label: 'Live (1x)', days: 1 / 86_400 },
  { label: '1 day / s', days: 1 },
  { label: '10 days / s', days: 10 },
  { label: '100 days / s', days: 100 },
  { label: '1 year / s', days: 365.25 },
];
// Minimum drawn radius in pixels so tiny worlds stay visible when zoomed out.
const MIN_PX = { Sun: 7, Moon: 3, default: 4.5 };

// Scale limits: light-years per screen pixel.
const MIN_SCALE = 1e-10;
const MAX_SCALE = 8e6;
const KIND_COLOR = {
  star: '#e6fff0',
  blackhole: '#ff5ad1',
  galaxy: '#9dff6b',
};

const PRESETS = [
  { label: 'Solar system', scale: 2.2e-6, cx: 0, cy: 0 },
  { label: 'Earth & Moon', scale: 1.6e-10, follow: 'Earth' },
  { label: 'Nearby stars', scale: 0.05, cx: 0, cy: 0 },
  {
    label: 'Milky Way',
    scale: 160,
    cx: SUN_TO_CENTRE_LY / 2,
    cy: 0,
    tilt: 0.85,
    spin: true,
  },
  { label: 'Local galaxies', scale: 8000, cx: 0, cy: 0 },
  { label: 'Deep space', scale: 700_000, cx: 0, cy: 0 },
];

/** A tiny seeded generator so the schematic star field never changes. */
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildStarField(count = 1800) {
  const rand = seeded(7);
  const dots = [];
  for (let i = 0; i < count; i++) {
    const r = MILKY_WAY_RADIUS_LY * Math.sqrt(rand());
    const a = rand() * Math.PI * 2;
    dots.push({
      x: SUN_TO_CENTRE_LY + r * Math.cos(a),
      y: r * Math.sin(a),
      b: 0.25 + rand() * 0.6,
    });
  }
  return dots;
}

/**
 * Thousands of stars laid along four spiral arms (blue-white, with a few pink
 * star-forming knots), in galactic X/Y light-years from the Sun.
 */
function buildArmDots() {
  const rand = seeded(11);
  const k = Math.tan((13 * Math.PI) / 180);
  const dots = [];
  for (let n = 0; n < 4; n++) {
    for (let i = 0; i < 1100; i++) {
      const t = rand() * 5.4;
      const r = 4200 * Math.exp(k * t);
      if (r > MILKY_WAY_RADIUS_LY) continue;
      const a = t + (n * Math.PI) / 2 + (rand() - 0.5) * (0.18 + r / 120000);
      const spread = (rand() - 0.5) * (900 + r * 0.05);
      const pink = rand() < 0.07;
      dots.push({
        x: SUN_TO_CENTRE_LY + (r + spread) * Math.cos(a),
        y: (r + spread) * Math.sin(a),
        size: pink ? 2.2 : 1.2 + rand() * 1.2,
        color: pink
          ? 'rgba(255,110,150,0.9)'
          : `rgba(${190 + rand() * 50},${215 + rand() * 30},255,${0.35 + rand() * 0.5})`,
      });
    }
  }
  return dots;
}

/** Round a length to 1, 2 or 5 times a power of ten. */
export function niceLength(value) {
  const power = 10 ** Math.floor(Math.log10(value));
  const f = value / power;
  return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * power;
}

/**
 * A full-screen map of the Sun's neighbourhood, the Milky Way and the galaxies
 * around it. Top-down on the galactic plane, with a logarithmic zoom and
 * distances measured from the Sun ("you are here").
 */
export function openCosmos({ preset = null, onClose = null } = {}) {
  const objects = cosmosWithPositions(COSMOS_OBJECTS);
  const stars = buildStarField();
  const journey = sunJourney();
  let simMs = Date.now();
  let speedDays = SPEEDS[2].days;
  let playing = true;
  let lastTs = 0;
  let follow = null;
  let bodies = solarBodies(new Date(simMs));
  // Optional: a NASA/JPL-Caltech Milky Way map saved as
  // public/textures/milkyway-map.jpg is drawn when present, to scale.
  const mapImg = new Image();
  mapImg.onload = () => schedule();
  mapImg.src = '/textures/milkyway-map.jpg';
  const armDots = buildArmDots();
  const images = {};
  for (const [name, info] of Object.entries(BODY_INFO)) {
    const img = new Image();
    img.onload = () => schedule();
    img.src = `/textures/planets/${info.texture}`;
    images[name] = img;
  }
  // Earth is drawn from a real NASA photo of the whole globe (Blue Marble style:
  // blue oceans, green land, white clouds) instead of a flat map cropped round.
  const galaxyStyle = 'map';
  const earthPhoto = new Image();
  earthPhoto.onload = () => schedule();
  earthPhoto.src = '/textures/cosmos/earth.jpg';

  const root = document.createElement('div');
  root.className = 'cosmos';
  const canvas = document.createElement('canvas');
  const head = document.createElement('div');
  head.className = 'cosmos-head';
  const title = document.createElement('b');
  title.textContent = 'COSMOS';
  const presetBox = document.createElement('div');
  presetBox.className = 'cosmos-presets';
  const close = document.createElement('button');
  close.textContent = 'Close';
  const lineupBtn = document.createElement('button');
  lineupBtn.type = 'button';
  lineupBtn.textContent = 'Lineup';
  lineupBtn.title = 'Poster view: the Sun and planets in a row, click one for a real picture';
  lineupBtn.onclick = () => import('./solarLineup.js').then((m) => m.openSolarLineup());
  head.append(title, presetBox, lineupBtn, close);
  const facts = document.createElement('div');
  facts.className = 'cosmos-facts';
  facts.textContent =
    `You are here: the Sun, ${formatDistance(journey.distanceToCentreLy)} ` +
    `from the galactic centre. The Sun moves about ${journey.orbitSpeedKms} km/s ` +
    `around it, one lap (a galactic year) every ~${journey.galacticYearMyr} ` +
    `million years, about ${journey.orbitsSoFar} laps so far. ${journey.note}`;
  const credit = document.createElement('div');
  credit.className = 'cosmos-credit';
  credit.textContent =
    'Planet pictures: Solar System Scope textures, CC BY 4.0. Galaxy map style after NASA/JPL-Caltech/R. Hurt. ' +
    'Orbits are computed live; click a planet for facts and missions.';
  facts.append(credit);
  const makeX = (title, onClose) => {
    const x = document.createElement('button');
    x.className = 'cosmos-x';
    x.type = 'button';
    x.textContent = '✕';
    x.title = title;
    x.setAttribute('aria-label', title);
    x.onclick = onClose;
    return x;
  };
  facts.append(
    makeX('Hide this note', () => {
      facts.style.display = 'none';
    }),
  );
  const timeBar = document.createElement('div');
  timeBar.className = 'cosmos-time';
  const playBtn = document.createElement('button');
  const speedSel = document.createElement('select');
  SPEEDS.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = s.label;
    speedSel.append(o);
  });
  speedSel.value = '2';
  const nowBtn = document.createElement('button');
  nowBtn.textContent = 'Now';
  const dateEl = document.createElement('span');
  const slider = (title, max) => {
    const wrap = document.createElement('label');
    wrap.textContent = title;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(max);
    input.value = '0';
    wrap.append(input);
    return { wrap, input };
  };
  const yawCtl = slider('Turn', 360);
  const tiltCtl = slider('Tilt', 80);
  const spinBtn = document.createElement('button');
  const topBtn = document.createElement('button');
  topBtn.textContent = 'Top view';
  timeBar.append(
    playBtn,
    speedSel,
    nowBtn,
    dateEl,
    yawCtl.wrap,
    tiltCtl.wrap,
    spinBtn,
    topBtn,
  );
  const card = document.createElement('div');
  card.className = 'cosmos-card';
  const readout = document.createElement('div');
  readout.className = 'cosmos-readout';
  root.append(canvas, head, facts, card, readout, timeBar);
  document.body.append(root);

  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let scale = PRESETS[0].scale; // ly per pixel
  let cx = 0;
  let cy = 0; // galactic X, Y at the screen centre
  let selected = null;
  let hover = null;
  let pointer = null;
  let frame = 0;

  // The view can be turned (yaw) and tipped (tilt) like holding the galaxy
  // in your hand: tilt 0 looks straight down on the plane, 1.4 almost edge-on.
  let yaw = 0;
  let tilt = 0;
  let spinView = false;
  let galaxyAngle = 0;
  const TILT_MAX = 1.4;
  function syncView() {
    yawCtl.input.value = String(Math.round((yaw * 180) / Math.PI));
    tiltCtl.input.value = String(Math.round((tilt * 180) / Math.PI));
    spinBtn.textContent = spinView ? 'Stop 360 spin' : '360 spin';
  }
  yawCtl.input.oninput = () => {
    yaw = (Number(yawCtl.input.value) * Math.PI) / 180;
    schedule();
  };
  tiltCtl.input.oninput = () => {
    tilt = Math.min(TILT_MAX, (Number(tiltCtl.input.value) * Math.PI) / 180);
    schedule();
  };
  spinBtn.onclick = () => {
    spinView = !spinView;
    syncView();
    schedule();
  };
  topBtn.onclick = () => {
    yaw = 0;
    tilt = 0;
    spinView = false;
    syncView();
    schedule();
  };
  syncView();

  const toScreen = (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [
      w / 2 + (dx * c - dy * s) / scale,
      h / 2 - ((dx * s + dy * c) * Math.cos(tilt)) / scale,
    ];
  };
  const toWorld = (sx, sy) => {
    const rx = (sx - w / 2) * scale;
    const ry = (-(sy - h / 2) * scale) / Math.cos(tilt);
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [cx + rx * c + ry * s, cy - rx * s + ry * c];
  };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = root.clientWidth;
    h = root.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function label(text, x, y, color = '#c8ffd9', align = 'left') {
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }

  function drawRings() {
    // Rings every power of ten that is between 40 and 400 px from the Sun.
    const [sx, sy] = toScreen(0, 0);
    ctx.lineWidth = 1;
    for (let p = -7; p <= 10; p++) {
      const ly = 10 ** p;
      const r = ly / scale;
      if (r < 40 || r > Math.max(w, h) * 1.2) continue;
      ctx.strokeStyle = 'rgba(0,255,102,0.16)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, r, r * Math.cos(tilt), 0, 0, Math.PI * 2);
      ctx.stroke();
      label(formatDistance(ly), sx + r + 4, sy - 4, 'rgba(160,230,185,0.6)');
    }
  }

  function drawGalaxy() {
    const [gx, gy] = toScreen(SUN_TO_CENTRE_LY, 0);
    const rpx = MILKY_WAY_RADIUS_LY / scale;
    if (rpx < 3) {
      // Far out: the whole galaxy is a small glowing smudge.
      ctx.fillStyle = 'rgba(157,255,107,0.9)';
      ctx.beginPath();
      ctx.arc(gx, gy, Math.max(2, rpx), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const k = 69 / scale; // the NASA map is 69 light-years per picture pixel
    const mapReady =
      galaxyStyle === 'map' && mapImg.complete && mapImg.naturalWidth > 0;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(1, Math.cos(tilt));
    ctx.rotate(-(yaw + galaxyAngle));
    if (mapReady) {
      // Picture up = towards +X (the centre lies "up" from the Sun in the map).
      ctx.rotate(Math.PI / 2);
      const f = mapImg.naturalWidth / 1932;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(
        mapImg,
        -965 * f * k,
        -960 * f * k,
        mapImg.naturalWidth * k,
        mapImg.naturalHeight * k,
      );
    } else {
      // Drawn in the style of the reference map: a blue-white haze, a long
      // yellow central bar tilted about 45 degrees, and four arms with pink
      // star-forming knots.
      const px = 1 / scale;
      const haze = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        MILKY_WAY_RADIUS_LY * px,
      );
      haze.addColorStop(0, 'rgba(160,175,225,0.50)');
      haze.addColorStop(0.55, 'rgba(120,140,205,0.30)');
      haze.addColorStop(1, 'rgba(60,80,150,0)');
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(0, 0, MILKY_WAY_RADIUS_LY * px, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.rotate(-Math.PI / 4);
      const bar = ctx.createRadialGradient(0, 0, 0, 0, 0, 4800 * px);
      bar.addColorStop(0, 'rgba(255,248,215,0.95)');
      bar.addColorStop(0.45, 'rgba(255,224,150,0.55)');
      bar.addColorStop(1, 'rgba(255,200,110,0)');
      ctx.fillStyle = bar;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4800 * px, 1700 * px, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (const d of armDots) {
        const x = (d.x - SUN_TO_CENTRE_LY) * px;
        const y = -d.y * px;
        ctx.fillStyle = d.color;
        ctx.fillRect(x, y, d.size, d.size);
      }
    }
    ctx.restore();
    if (rpx > 40) {
      const gc = Math.cos(galaxyAngle);
      const gs = Math.sin(galaxyAngle);
      for (const d of stars) {
        const ox = d.x - SUN_TO_CENTRE_LY;
        const [x, y] = toScreen(
          SUN_TO_CENTRE_LY + ox * gc - d.y * gs,
          ox * gs + d.y * gc,
        );
        if (x < 0 || y < 0 || x > w || y > h) continue;
        ctx.fillStyle = `rgba(230,255,235,${d.b})`;
        ctx.fillRect(x, y, 1.3, 1.3);
      }
      label(
        'Milky Way (drawn to match the NASA map; turning is sped up)',
        gx,
        gy - rpx - 8,
        '#9dff6b',
        'center',
      );
    }
  }

  // Position and drawn radius (px) of a Sun/planet/Moon body on screen.
  function bodyScreen(b) {
    const info = BODY_INFO[b.name];
    const [px, py] = toScreen(b.x, b.y);
    const physPx = info.diameterKm / 2 / KM_PER_LY / scale;
    const min = MIN_PX[b.name] ?? MIN_PX.default;
    return { px, py, r: Math.min(Math.max(min, physPx), 60000) };
  }

  function drawDisc(b, px, py, r) {
    const info = BODY_INFO[b.name];
    const img = images[b.name];
    if (b.kind === 'sun') {
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 18;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();
    if (
      b.name === 'Earth' &&
      earthPhoto.complete &&
      earthPhoto.naturalWidth === 1280
    ) {
      // The globe fills the middle of the photo: centre (640, 625), radius 545.
      ctx.drawImage(earthPhoto, 95, 80, 1090, 1090, px - r, py - r, r * 2, r * 2);
    } else if (img?.complete && img.naturalWidth) {
      // The picture is a flat map: show its central square as the disc.
      const side = img.naturalHeight;
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        0,
        side,
        side,
        px - r,
        py - r,
        r * 2,
        r * 2,
      );
    } else {
      ctx.fillStyle = info.color;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    if (b.kind !== 'sun' && b.name !== 'Earth' && r > 3) {
      // Night side away from the Sun.
      const [sx, sy] = toScreen(0, 0);
      const dx = px - sx;
      const dy = py - sy;
      const len = Math.hypot(dx, dy) || 1;
      const g = ctx.createRadialGradient(
        px - (dx / len) * r * 0.45,
        py - (dy / len) * r * 0.45,
        r * 0.1,
        px,
        py,
        r * 1.15,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = g;
      ctx.fillRect(px - r, py - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    if (BODY_INFO[b.name].rings) {
      ctx.strokeStyle = 'rgba(226,205,150,0.75)';
      ctx.lineWidth = Math.max(1, r * 0.35);
      ctx.beginPath();
      ctx.ellipse(px, py, r * 1.9, r * 0.55, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (b === selected) {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPlanets() {
    const [sx, sy] = toScreen(0, 0);
    ctx.lineWidth = 1;
    for (const p of bodies) {
      if (p.kind === 'planet') {
        const r = (p.au * LY_PER_AU) / scale;
        if (r >= 3 && r <= Math.max(w, h) * 40) {
          ctx.strokeStyle = 'rgba(0,255,102,0.2)';
          ctx.beginPath();
          ctx.ellipse(sx, sy, r, r * Math.cos(tilt), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    const earth = bodies.find((b) => b.name === 'Earth');
    const moon = bodies.find((b) => b.name === 'Moon');
    const [ex, ey] = toScreen(earth.x, earth.y);
    const moonRing = Math.hypot(moon.x - earth.x, moon.y - earth.y) / scale;
    if (moonRing > 8 && moonRing < Math.max(w, h) * 40) {
      ctx.strokeStyle = 'rgba(216,216,216,0.25)';
      ctx.beginPath();
      ctx.ellipse(
        ex,
        ey,
        moonRing,
        moonRing * Math.cos(tilt),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    for (const b of bodies) {
      const { px, py, r } = bodyScreen(b);
      if (px < -r - 40 || py < -r - 40 || px > w + r + 40 || py > h + r + 40) {
        continue;
      }
      if (b.name === 'Moon' && moonRing < 8) continue;
      if (b.kind === 'planet' && (b.au * LY_PER_AU) / scale < 3) continue;
      drawDisc(b, px, py, r);
      if (b.kind === 'sun') continue;
      const text =
        b.kind === 'planet' ? `${b.name} ${b.au.toFixed(2)} AU` : b.name;
      label(text, px + r + 5, py - r - 3);
    }
  }

  function drawObjects() {
    for (const o of objects) {
      const [x, y] = toScreen(o.x, o.y);
      if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
      const color = KIND_COLOR[o.kind];
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.beginPath();
      if (o.kind === 'blackhole') {
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === 'galaxy') {
        ctx.ellipse(x, y, 6, 3, 0.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        drawStarGlow(ctx, x, y, 11, starLook(o.name).color);
      }
      if (o === hover || o === selected || scale < 1e5) {
        label(o.name, x + 8, y + 3, o === selected ? '#ffffff' : color);
      }
    }
  }

  function drawSun() {
    const [sx, sy] = toScreen(0, 0);
    if (sx < -200 || sy < -200 || sx > w + 200 || sy > h + 200) return;
    const sr = bodyScreen(bodies[0]).r;
    label(
      'YOU ARE HERE: Sun / Solar System',
      sx + sr + 6,
      sy + sr + 14,
      '#ffe36b',
    );
    // The Sun's motion around the galactic centre points along +Y (l = 90).
    ctx.strokeStyle = '#ffe36b';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 12);
    ctx.lineTo(sx, sy - 44);
    ctx.lineTo(sx - 5, sy - 36);
    ctx.moveTo(sx, sy - 44);
    ctx.lineTo(sx + 5, sy - 36);
    ctx.stroke();
    label(
      `${journey.orbitSpeedKms} km/s around the galaxy`,
      sx + 8,
      sy - 30,
      '#ffe36b',
    );
  }

  function drawScaleBar() {
    const target = scale * 140;
    const length = niceLength(target);
    const px = length / scale;
    const x = 24;
    const y = h - 26;
    ctx.strokeStyle = '#c8ffd9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + px, y);
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + px, y - 5);
    ctx.lineTo(x + px, y + 5);
    ctx.stroke();
    label(formatDistance(length), x + px + 10, y + 4);
  }

  function draw(ts = 0) {
    frame = 0;
    if (playing && lastTs) {
      const dt = Math.min(0.1, (ts - lastTs) / 1000);
      simMs += dt * speedDays * DAY_MS;
      // The galaxy turns on screen (far faster than the real 230 million years a lap).
      galaxyAngle += dt * 0.04;
      if (spinView) {
        yaw = (yaw + dt * 0.25) % (Math.PI * 2);
        syncView();
      }
    }
    lastTs = playing ? ts : 0;
    bodies = solarBodies(new Date(simMs));
    if (follow) {
      const f = bodies.find((b) => b.name === follow);
      if (f) {
        cx = f.x;
        cy = f.y;
      }
    }
    dateEl.textContent = `${new Date(simMs).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(
      w / 2,
      h / 2,
      0,
      w / 2,
      h / 2,
      Math.max(w, h),
    );
    bg.addColorStop(0, '#04170b');
    bg.addColorStop(1, '#010503');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
    drawGalaxy();
    drawRings();
    drawPlanets();
    drawObjects();
    drawSun();
    drawScaleBar();
    if (pointer) {
      const [wx, wy] = toWorld(pointer.x, pointer.y);
      const dist = Math.hypot(wx, wy);
      readout.textContent = `Cursor is ${formatDistance(dist)} from the Sun (in the galactic plane)`;
    }
    if (playing) schedule();
  }

  function nearest(sx, sy) {
    let best = null;
    let bestD = 14;
    for (const b of bodies) {
      const { px, py, r } = bodyScreen(b);
      if (
        b.name === 'Moon' &&
        Math.hypot(b.x - bodies[3].x, b.y - bodies[3].y) / scale < 8
      ) {
        continue;
      }
      const d = Math.hypot(px - sx, py - sy);
      if (d <= Math.max(14, r) && (best === null || d < bestD)) {
        best = b;
        bestD = Math.min(d, 14);
      }
    }
    for (const o of objects) {
      const [x, y] = toScreen(o.x, o.y);
      const d = Math.hypot(x - sx, y - sy);
      if (d < bestD) {
        best = o;
        bestD = d;
      }
    }
    return best;
  }

  // The real picture at the top of a card. Click it to see it large.
  function addPhoto(photo) {
    if (!photo) return;
    const img = document.createElement('img');
    img.className = 'cosmos-portrait cosmos-photo';
    img.src = photo.src;
    img.alt = photo.caption;
    img.title = 'Click to enlarge';
    img.onclick = () => openPhoto(photo);
    card.append(img);
    const cap = document.createElement('div');
    cap.className = 'cosmos-credit';
    cap.textContent = photo.caption;
    card.append(cap);
  }

  function openPhoto(photo) {
    const box = document.createElement('div');
    box.className = 'cosmos-lightbox';
    const shut = () => {
      box.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        shut();
      }
    };
    document.addEventListener('keydown', onKey, true);
    const big = document.createElement('img');
    big.src = photo.src;
    big.alt = photo.caption;
    big.onclick = (e) => e.stopPropagation();
    const cap = document.createElement('div');
    cap.className = 'cosmos-credit';
    cap.textContent = photo.caption;
    cap.onclick = (e) => e.stopPropagation();
    box.append(makeX('Close picture', shut), big, cap);
    box.onclick = shut;
    root.append(box);
  }

  function showCard(o) {
    if (!o) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'block';
    card.replaceChildren(
      makeX('Close this card', () => {
        selected = null;
        card.style.display = 'none';
        schedule();
      }),
    );
    if (o.kind === 'sun' || o.kind === 'planet' || o.kind === 'moon') {
      addPhoto(cosmosPhoto(o.name));
      const add = (text, className) => {
        const div = document.createElement('div');
        div.textContent = text;
        if (className) div.className = className;
        card.append(div);
      };
      add(o.name, 'cosmos-card-title');
      bodyFacts(o).forEach((row) => add(row, 'cosmos-card-row'));
      if (o.name !== 'Earth') {
        add(`Missions (as of ${MISSIONS_AS_OF})`, 'cosmos-card-sub');
        add(targetSummary(o.name), 'cosmos-card-row');
        missionsFor(o.name)
          .slice(0, 8)
          .forEach((m) =>
            add(
              `${m.name}, ${m.agency}, ${m.launched}: ${m.status}`,
              'cosmos-card-row',
            ),
          );
      }
      return;
    }
    const km = o.ly * KM_PER_LY;
    if (o.kind !== 'star') addPhoto(cosmosPhoto(o.name));
    if (o.kind === 'star') {
      const photo = STAR_PHOTOS[o.name] ?? cosmosPhoto(o.name);
      if (photo) {
        addPhoto(photo);
      } else {
        const portrait = document.createElement('canvas');
        portrait.width = 220;
        portrait.height = 220;
        portrait.className = 'cosmos-portrait';
        drawStarPortrait(portrait, o.name);
        card.append(portrait);
        const cap = document.createElement('div');
        cap.className = 'cosmos-credit';
        cap.textContent = NO_PHOTO_NOTE;
        card.append(cap);
      }
    }
    const lines = [
      o.name,
      o.kind === 'star'
        ? sizeLine(o.name)
        : `${o.kind === 'blackhole' ? 'black hole' : o.kind}`,
      `${formatDistance(o.ly)} from the Sun${o.uncertain ? ' (approximate)' : ''}`,
      `${km.toExponential(2)} km`,
      lightTravelTime(o.ly),
      o.note,
    ];
    lines.forEach((text, i) => {
      const div = document.createElement('div');
      div.textContent = text;
      if (i === 0) div.className = 'cosmos-card-title';
      card.append(div);
    });
  }

  function zoomAt(sx, sy, factor) {
    const [wx, wy] = toWorld(sx, sy);
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const [nx, ny] = toWorld(sx, sy);
    cx += wx - nx;
    cy += wy - ny;
    schedule();
  }

  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.textContent = p.label;
    b.onclick = () => {
      scale = p.scale;
      follow = p.follow ?? null;
      cx = p.cx ?? 0;
      cy = p.cy ?? 0;
      tilt = p.tilt ?? 0;
      spinView = Boolean(p.spin);
      yaw = 0;
      syncView();
      schedule();
    };
    presetBox.append(b);
  });
  const startView = PRESETS.find((p) => p.label === preset);
  if (startView) {
    scale = startView.scale;
    follow = startView.follow ?? null;
    cx = startView.cx ?? 0;
    cy = startView.cy ?? 0;
    tilt = startView.tilt ?? 0;
    spinView = Boolean(startView.spin);
    syncView();
  }

  const syncPlay = () => {
    playBtn.textContent = playing ? 'Pause' : 'Play';
  };
  syncPlay();
  playBtn.onclick = () => {
    playing = !playing;
    syncPlay();
    schedule();
  };
  speedSel.onchange = () => {
    speedDays = SPEEDS[Number(speedSel.value)].days;
  };
  nowBtn.onclick = () => {
    simMs = Date.now();
    schedule();
  };

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    drag = {
      x: e.clientX,
      y: e.clientY,
      wx,
      wy,
      yaw,
      tilt,
      rotate: e.shiftKey || e.button === 2,
      moved: false,
    };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) {
        drag.moved = true;
        follow = null;
      }
      if (drag.rotate) {
        // Shift- or right-drag turns and tips the view.
        yaw = drag.yaw + dx * 0.008;
        tilt = Math.max(0, Math.min(TILT_MAX, drag.tilt + dy * 0.008));
        syncView();
      } else {
        const [nx, ny] = toWorld(pointer.x, pointer.y);
        cx += drag.wx - nx;
        cy += drag.wy - ny;
      }
    } else {
      hover = nearest(pointer.x, pointer.y);
      canvas.style.cursor = hover ? 'pointer' : 'grab';
    }
    schedule();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) {
      const rect = canvas.getBoundingClientRect();
      selected = nearest(e.clientX - rect.left, e.clientY - rect.top);
      showCard(selected);
    }
    drag = null;
    schedule();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(
        e.clientX - rect.left,
        e.clientY - rect.top,
        e.deltaY > 0 ? 1.25 : 0.8,
      );
    },
    { passive: false },
  );

  const onKey = (e) => {
    if (e.key === 'Escape') dispose();
  };
  function dispose() {
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey);
    cancelAnimationFrame(frame);
    root.remove();
    onClose?.();
  }
  close.onclick = dispose;
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKey);
  resize();
  return dispose;
}
