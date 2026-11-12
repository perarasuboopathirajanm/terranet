import { BODY_INFO } from './solarBodies.js';
import { cosmosPhoto } from './cosmosPhotos.js';

// A poster-style view of the solar system: the Sun large at the left, the
// planets in a row with their names and orbit lines, an asteroid belt between
// Mars and Jupiter. Sizes and spacing are for show, not to scale. Click a
// planet to see a real NASA picture of it.
const ORDER = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];
// Drawn size as a share of the screen height (not to scale).
const SIZE = {
  Mercury: 0.04,
  Venus: 0.058,
  Earth: 0.062,
  Mars: 0.05,
  Jupiter: 0.17,
  Saturn: 0.13,
  Uranus: 0.085,
  Neptune: 0.085,
};

const CSS = `
.lineup{position:fixed;inset:0;z-index:300;background:#02030a;color:#c8ffd9;font:12px/1.4 'JetBrains Mono',ui-monospace,monospace}
.lineup canvas{position:absolute;inset:0;width:100%;height:100%;cursor:pointer}
.lineup-x{position:absolute;top:14px;right:16px;border:1px solid rgba(0,255,102,.4);border-radius:14px;padding:8px 14px;cursor:pointer;
  color:#c8ffd9;background:rgba(2,10,6,.7);font:inherit;letter-spacing:.15em}
.lineup-note{position:absolute;left:16px;bottom:10px;font-size:10px;color:rgba(200,255,217,.6);max-width:60vw}
.lineup-card{position:absolute;right:16px;bottom:16px;width:min(340px,calc(100vw - 32px));border:1px solid rgba(0,255,102,.35);border-radius:18px;
  background:rgba(2,10,6,.88);backdrop-filter:blur(14px);padding:12px;display:none}
.lineup-card.show{display:block}
.lineup-card img{width:100%;border-radius:12px;display:block;background:#000;cursor:zoom-in}
.lineup-card h3{margin:10px 0 2px;font-size:15px;letter-spacing:.12em;color:#9dff6b}
.lineup-card p{margin:2px 0;color:rgba(200,255,217,.85)}
.lineup-card small{display:block;margin-top:6px;color:rgba(200,255,217,.55)}
`;

function stars(count) {
  const out = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i += 1)
    out.push({ x: rnd(), y: rnd(), r: rnd() * 1.4 + 0.2, a: rnd() * 0.8 + 0.2 });
  return out;
}

/** Open the lineup view. Returns a function that closes it. */
export function openSolarLineup({ onClose = null } = {}) {
  if (document.querySelector('.lineup')) return () => {};
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const root = document.createElement('div');
  root.className = 'lineup';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const closeBtn = document.createElement('button');
  closeBtn.className = 'lineup-x';
  closeBtn.type = 'button';
  closeBtn.textContent = 'CLOSE';
  const note = document.createElement('div');
  note.className = 'lineup-note';
  note.textContent =
    'Sizes and spacing are for show, not to scale. Click a planet to see a real picture.';
  const card = document.createElement('div');
  card.className = 'lineup-card';
  root.append(canvas, closeBtn, note, card);
  document.body.append(root);

  const field = stars(380);
  const belt = [];
  for (let i = 0; i < 260; i += 1)
    belt.push({ t: Math.random(), o: (Math.random() - 0.5) * 0.09, r: Math.random() * 2 + 0.6 });
  const imgs = {};
  const load = (name, src) => {
    const img = new Image();
    img.onload = () => draw();
    img.src = src;
    imgs[name] = img;
  };
  load('bg', '/textures/cosmos/milky-way.jpg');
  load('Sun', '/textures/planets/2k_sun.jpg');
  for (const name of [...ORDER, 'Moon'])
    load(name, `/textures/planets/${BODY_INFO[name].texture}`);

  let w = 0;
  let h = 0;
  let hits = [];
  let selected = null;

  function layout() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function disc(name, x, y, r) {
    const img = imgs[name];
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (img?.complete && img.naturalWidth) {
      const side = img.naturalHeight;
      ctx.drawImage(img, (img.naturalWidth - side) / 2, 0, side, side, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = BODY_INFO[name]?.color || '#888';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Light from the Sun on the left, shade on the right.
    const g = ctx.createRadialGradient(x - r * 0.5, y - r * 0.2, r * 0.2, x, y, r * 1.1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function draw() {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#05060f');
    bg.addColorStop(0.5, '#0a0820');
    bg.addColorStop(1, '#120716');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const back = imgs.bg;
    if (back?.complete && back.naturalWidth) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(back, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    for (const s of field) {
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // The Sun, large and cut off by the left edge.
    const sunR = h * 0.36;
    const sunX = -sunR * 0.35;
    const sunY = h * 0.55;
    const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.8, sunX, sunY, sunR * 1.7);
    glow.addColorStop(0, 'rgba(255,170,40,0.55)');
    glow.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w * 0.6, h);
    disc('Sun', sunX, sunY, sunR);

    // Planets along a gentle upward slope; orbit lines are ellipses around the Sun.
    const x0 = sunX + sunR + w * 0.045;
    const x1 = w * 0.93;
    hits = [];
    const spots = ORDER.map((name, i) => {
      const t = i / (ORDER.length - 1);
      const ease = Math.pow(t, 0.85);
      return {
        name,
        x: x0 + (x1 - x0) * ease,
        y: sunY - h * 0.05 - ease * h * 0.2 + (i % 2 ? h * 0.015 : -h * 0.015),
        r: (SIZE[name] * h) / 2,
      };
    });
    ctx.lineWidth = 1;
    for (const s of spots) {
      const rx = s.x - sunX;
      ctx.strokeStyle = 'rgba(210,225,255,0.38)';
      ctx.beginPath();
      ctx.ellipse(sunX, sunY, rx, Math.min(h * 0.62, rx * 0.55), -0.05, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Asteroid belt between Mars and Jupiter.
    const mars = spots.find((s) => s.name === 'Mars');
    const jup = spots.find((s) => s.name === 'Jupiter');
    const beltX = (mars.x + jup.x) / 2;
    const beltRx = beltX - sunX;
    for (const a of belt) {
      const ang = Math.PI * (0.05 + a.t * 0.55);
      const rx = beltRx * (1 + a.o);
      const ry = Math.min(h * 0.62, beltRx * 0.55) * (1 + a.o);
      ctx.fillStyle = 'rgba(190,170,150,0.8)';
      ctx.beginPath();
      ctx.arc(sunX + Math.cos(ang) * rx, sunY + Math.sin(ang) * ry * 0.9, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(220,230,255,0.75)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ASTEROID BELT', beltX, sunY + h * 0.2);

    for (const s of spots) {
      if (s.name === 'Saturn') {
        ctx.strokeStyle = 'rgba(226,205,150,0.85)';
        ctx.lineWidth = Math.max(2, s.r * 0.28);
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r * 2.0, s.r * 0.55, -0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      disc(s.name, s.x, s.y, s.r);
      if (s.name === 'Earth') {
        const mx = s.x - s.r * 1.2;
        const my = s.y - s.r * 2.2;
        disc('Moon', mx, my, s.r * 0.3);
        label('MOON', mx, my - s.r * 0.55);
        hits.push({ name: 'Moon', x: mx, y: my, r: s.r * 0.4 });
      }
      label(s.name.toUpperCase(), s.x, s.y - s.r - 8);
      if (selected === s.name) {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      hits.push({ name: s.name, x: s.x, y: s.y, r: Math.max(s.r * (s.name === 'Saturn' ? 2 : 1), 14) });
    }
    hits.push({ name: 'Sun', x: sunX, y: sunY, r: sunR });
  }

  function label(text, x, y) {
    ctx.fillStyle = 'rgba(235,242,255,0.95)';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  }

  function show(name) {
    selected = name;
    const info = BODY_INFO[name] || {};
    const photo = cosmosPhoto(name);
    card.replaceChildren();
    if (photo) {
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = `Real picture of ${name}`;
      img.onclick = () => window.open(photo.src, '_blank', 'noopener');
      card.append(img);
    }
    const title = document.createElement('h3');
    title.textContent = name.toUpperCase();
    card.append(title);
    if (info.note) {
      const p = document.createElement('p');
      p.textContent = info.note;
      card.append(p);
    }
    const facts = [];
    if (info.diameterKm) facts.push(`Diameter ${info.diameterKm.toLocaleString()} km`);
    if (info.period) facts.push(`Year: ${info.period}`);
    if (info.moons != null) facts.push(`Moons: ${info.moons}`);
    for (const f of facts) {
      const p = document.createElement('p');
      p.textContent = f;
      card.append(p);
    }
    if (photo) {
      const small = document.createElement('small');
      small.textContent = photo.caption;
      card.append(small);
    }
    card.classList.add('show');
    draw();
  }

  canvas.addEventListener('click', (event) => {
    const x = event.clientX;
    const y = event.clientY;
    const hit = [...hits]
      .reverse()
      .find((c) => Math.hypot(x - c.x, y - c.y) <= c.r);
    if (hit) show(hit.name);
    else {
      selected = null;
      card.classList.remove('show');
      draw();
    }
  });

  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  const onResize = () => {
    layout();
    draw();
  };
  function close() {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    root.remove();
    style.remove();
    onClose?.();
  }
  closeBtn.onclick = close;
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);
  layout();
  draw();
  return close;
}
