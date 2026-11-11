// What each named star looks like: its colour (from its surface temperature)
// and its width compared with the Sun. Rounded published values.
export const STAR_LOOK = Object.freeze({
  'Proxima Centauri': { color: '#ff6a4a', sun: 0.15, type: 'red dwarf' },
  'Alpha Centauri': { color: '#ffe9a8', sun: 1.2, type: 'sun-like pair' },
  "Barnard's Star": { color: '#ff7a55', sun: 0.19, type: 'red dwarf' },
  Sirius: { color: '#cfe3ff', sun: 1.7, type: 'blue-white star' },
  Procyon: { color: '#fff4d6', sun: 2.0, type: 'yellow-white star' },
  Altair: { color: '#f2f6ff', sun: 1.8, type: 'white star' },
  Vega: { color: '#bcd4ff', sun: 2.4, type: 'blue-white star' },
  Fomalhaut: { color: '#e4eeff', sun: 1.8, type: 'white star' },
  Pollux: { color: '#ffb066', sun: 8.8, type: 'orange giant' },
  Arcturus: { color: '#ff9a4d', sun: 25, type: 'orange giant' },
  'TRAPPIST-1': { color: '#ff5a3d', sun: 0.12, type: 'ultracool red dwarf' },
  Capella: { color: '#ffe28a', sun: 12, type: 'yellow giants' },
  Aldebaran: { color: '#ff8a3d', sun: 44, type: 'orange giant' },
  Regulus: { color: '#b7d0ff', sun: 3.1, type: 'blue-white star' },
  Spica: { color: '#a9c4ff', sun: 7.5, type: 'blue giant pair' },
  Betelgeuse: { color: '#ff5a2e', sun: 764, type: 'red supergiant' },
  Antares: { color: '#ff4a2a', sun: 680, type: 'red supergiant' },
  Rigel: { color: '#aecbff', sun: 79, type: 'blue supergiant' },
  Deneb: { color: '#e8f1ff', sun: 200, type: 'white supergiant' },
});

const FALLBACK = { color: '#e6fff0', sun: 1, type: 'star' };

export function starLook(name) {
  return STAR_LOOK[name] ?? FALLBACK;
}

/** One line comparing a star's width with the Sun's. */
export function sizeLine(name) {
  const { sun, type } = starLook(name);
  if (sun === 1) return type;
  if (sun < 1) return `${type}, about ${sun} times the Sun's width`;
  return `${type}, about ${sun} times the Sun's width`;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A soft glow with a bright core, used for stars on the map. */
export function drawStarGlow(ctx, x, y, radius, color) {
  const [r, g, b] = hexToRgb(color);
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(0.18, `rgba(${r},${g},${b},0.95)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.28)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Real images from NASA (public archive). Most stars are too far to show as a
// disc, so only a few have a true picture; some are artist's concepts, said so.
export const STAR_PHOTOS = Object.freeze({
  Betelgeuse: {
    src: '/textures/stars/betelgeuse.jpg',
    caption:
      'Real image: Betelgeuse and its clumpy envelope, infrared, Herschel Space Observatory (ESA/Herschel/PACS/L. Decin et al., via NASA/JPL)',
  },
  Altair: {
    src: '/textures/stars/altair.jpg',
    caption:
      'Real image: Altair, the star that spins so fast it bulges (NASA/JPL/Caltech/Steve Golden)',
  },
  'Alpha Centauri': {
    src: '/textures/stars/alpha-centauri.jpg',
    caption:
      'Real image: Alpha Centauri A and B, Hubble Space Telescope (NASA/ESA)',
  },
  Fomalhaut: {
    src: '/textures/stars/fomalhaut.jpg',
    caption:
      'Real image: the dust disc around Fomalhaut (NASA/JPL/Caltech/Maxwell Telescope)',
  },
  'TRAPPIST-1': {
    src: '/textures/stars/trappist-1.jpg',
    caption:
      "Artist's concept (not a photo): the TRAPPIST-1 system (NASA/JPL-Caltech)",
  },
  Vega: {
    src: '/textures/stars/vega.jpg',
    caption:
      "Artist's concept (not a photo): the collision that made Vega's dust ring (NASA/JPL-Caltech)",
  },
});

export const NO_PHOTO_NOTE =
  'No telescope can show this star as more than a point of light, so this is how it looks in a telescope image: its true colour with light spikes.';

/**
 * A point of light as a telescope sees it: the star's colour, a glow sized by
 * how big and bright it is, diffraction spikes and a few faint background stars.
 */
export function drawStarPortrait(canvas, name) {
  const look = starLook(name);
  const size = canvas.width;
  const c = canvas.getContext('2d');
  if (!c) return;
  const [r, g, b] = hexToRgb(look.color);
  const mid = size / 2;
  c.fillStyle = '#010302';
  c.fillRect(0, 0, size, size);
  let seed = [...name].reduce((a, ch) => a + ch.charCodeAt(0), 7);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.5})`;
    c.fillRect(rand() * size, rand() * size, 1.2, 1.2);
  }
  // Bigger stars glow wider (log scale of their width against the Sun).
  const bigness = Math.min(1, Math.max(0.15, (Math.log10(look.sun) + 1) / 3.2));
  const glow = size * (0.16 + 0.3 * bigness);
  const halo = c.createRadialGradient(mid, mid, 0, mid, mid, glow * 2.2);
  halo.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
  halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
  c.fillStyle = halo;
  c.fillRect(0, 0, size, size);
  // Diffraction spikes: four long thin lines, as in space-telescope photos.
  const reach = size * (0.28 + 0.2 * bigness);
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const line = c.createLinearGradient(
      mid - Math.cos(a) * reach,
      mid - Math.sin(a) * reach,
      mid + Math.cos(a) * reach,
      mid + Math.sin(a) * reach,
    );
    line.addColorStop(0, `rgba(${r},${g},${b},0)`);
    line.addColorStop(0.5, `rgba(255,255,255,0.9)`);
    line.addColorStop(1, `rgba(${r},${g},${b},0)`);
    c.strokeStyle = line;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(mid - Math.cos(a) * reach, mid - Math.sin(a) * reach);
    c.lineTo(mid + Math.cos(a) * reach, mid + Math.sin(a) * reach);
    c.stroke();
  }
  const core = c.createRadialGradient(mid, mid, 0, mid, mid, glow * 0.55);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.4, look.color);
  core.addColorStop(1, `rgba(${r},${g},${b},0)`);
  c.fillStyle = core;
  c.beginPath();
  c.arc(mid, mid, glow * 0.55, 0, Math.PI * 2);
  c.fill();
}
