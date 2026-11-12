// Puts the main screen's button groups at fixed spots.
// A group is moved with a CSS offset (`translate`), so its own
// layout, size and the way its panels are placed are left exactly as they are.
// The layout is locked: every group is placed at its home spot below, and
// there is no way to drag it on screen.
// `home` is where the group's top-left corner sits by default, as a share of the
// window width and height (the layout chosen on the real screen).
const TARGETS = [
  { selector: '.cosmos-launch', key: 'cosmos', touch: true, home: [0.763, 0.025] },
  { selector: '.map-switch', key: 'map', touch: true, home: [0.659, 0.027] },
  { selector: '#left-panel-stack', key: 'left', touch: false, home: [0.295, 0.022] },
  { selector: '#right-context-rail', key: 'right', touch: false, home: [0.879, 0.164] },
  { selector: '.atlas-panel', key: 'alerts', touch: true, home: [0.029, 0.827] },
  { selector: '#command-dock', key: 'dock', touch: true, home: [0.528, 0.82] },
];
const STORE = 'terranet.dragOffsets.v3';
const LOCK_STORE = 'terranet.dragLocked.v1';
// Narrow screens keep each group's own layout; the chosen layout is for desktops.
const MIN_WIDTH = 900;
const THRESHOLD = 6;
const KEEP = 48; // pixels of the group that must stay on screen

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}') || {};
  } catch {
    return {};
  }
}
function save(all) {
  try {
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    /* positions just are not remembered */
  }
}

/** The box around a group and everything inside it (some groups are 0x0 shells). */
function extent(node) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const visit = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
  };
  visit(node);
  for (const el of node.querySelectorAll('*')) visit(el);
  return Number.isFinite(left) ? { left, top, right, bottom } : null;
}

function apply(node, x, y) {
  node.style.setProperty('translate', `${x}px ${y}px`);
}

function clampOffset(node, current, wanted) {
  const box = extent(node);
  if (!box) return wanted;
  let { x, y } = wanted;
  const dx = x - current.x;
  const dy = y - current.y;
  const left = box.left + dx;
  const right = box.right + dx;
  const top = box.top + dy;
  const bottom = box.bottom + dy;
  if (right < KEEP) x += KEEP - right;
  if (left > innerWidth - KEEP) x -= left - (innerWidth - KEEP);
  if (bottom < KEEP) y += KEEP - bottom;
  if (top > innerHeight - KEEP) y -= top - (innerHeight - KEEP);
  return { x, y };
}

function attach(node, key, all, touch, home, lock) {
  if (node.dataset.dragMove) return;
  node.dataset.dragMove = '1';
  if (touch) node.style.touchAction = 'none';
  let offset = all[key] ? { ...all[key] } : { x: 0, y: 0 };
  if (all[key]) apply(node, offset.x, offset.y);
  // No saved position: move the group so its top-left lands on its home spot.
  const goHome = (tries = 0) => {
    if (all[key] || innerWidth < MIN_WIDTH) return;
    const box = extent(node);
    if (!box) {
      if (tries < 90) requestAnimationFrame(() => goHome(tries + 1));
      return;
    }
    const x = offset.x + home[0] * innerWidth - box.left;
    const y = offset.y + home[1] * innerHeight - box.top;
    offset = { x, y };
    apply(node, x, y);
  };
  goHome();

  let start = null;
  let dragging = false;
  const stopSelect = (event) => event.preventDefault();

  node.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || lock.on) return;
    if (event.target.closest('input,textarea,select,[contenteditable]')) return;
    start = {
      id: event.pointerId,
      px: event.clientX,
      py: event.clientY,
      base: { ...offset },
    };
    dragging = false;
  });
  node.addEventListener('pointermove', (event) => {
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.px;
    const dy = event.clientY - start.py;
    if (!dragging) {
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      dragging = true;
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        /* the drag still follows the cursor */
      }
      document.addEventListener('selectstart', stopSelect);
      node.style.cursor = 'grabbing';
    }
    offset = clampOffset(node, offset, {
      x: start.base.x + dx,
      y: start.base.y + dy,
    });
    apply(node, offset.x, offset.y);
  });
  const finish = (event) => {
    if (!start || event.pointerId !== start.id) return;
    const wasDragging = dragging;
    start = null;
    dragging = false;
    if (!wasDragging) return;
    document.removeEventListener('selectstart', stopSelect);
    node.style.cursor = '';
    all[key] = { ...offset };
    save(all);
    // Swallow the click that ends a drag so a button is not pressed by mistake.
    const stop = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };
    node.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => node.removeEventListener('click', stop, true), 50);
  };
  node.addEventListener('pointerup', finish);
  node.addEventListener('pointercancel', finish);
  node.addEventListener('dblclick', (event) => {
    if (!event.altKey) return;
    delete all[key];
    save(all);
    offset = { x: 0, y: 0 };
    node.style.removeProperty('translate');
    requestAnimationFrame(() => goHome());
  });
  window.addEventListener('resize', () => {
    if (all[key]) {
      offset = clampOffset(node, offset, offset);
      apply(node, offset.x, offset.y);
    } else {
      offset = { x: 0, y: 0 };
      node.style.removeProperty('translate');
      requestAnimationFrame(() => goHome());
    }
  });
}

/** Make every known button group draggable; groups that appear later are picked up. */
export function mountDragMove() {
  // Fixed layout: no drag option is shown and saved positions are ignored.
  const all = {};
  const lock = { on: true };
  const scan = () => {
    for (const { selector, key, touch, home } of TARGETS) {
      const node = document.querySelector(selector);
      if (node) attach(node, key, all, touch, home, lock);
    }
  };
  scan();
  // The app builds some panels late and may rebuild them, so keep watching.
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
