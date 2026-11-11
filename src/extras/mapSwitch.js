const OPTIONS = [
  { id: 'photoreal', label: '3D City' },
  { id: 'bing-aerial', label: 'Bing Aerial' },
  { id: 'bing-labels', label: 'Aerial + Names' },
  { id: 'esri-imagery', label: 'Esri Satellite' },
  { id: 'osm', label: 'Voyager Map' },
];

const CSS = `
.map-switch{position:fixed;left:196px;top:126px;z-index:60;font:600 11px/1 'JetBrains Mono',ui-monospace,monospace}
.map-switch-btn{display:flex;align-items:center;gap:8px;border:1px solid rgba(0,255,102,.35);border-radius:16px;padding:10px 16px;cursor:pointer;
  color:#c8ffd9;letter-spacing:.2em;font:inherit;font-size:12px;background:linear-gradient(145deg,rgba(14,38,22,.92),rgba(4,16,9,.92));
  box-shadow:4px 4px 12px rgba(0,0,0,.5)}
.map-switch-btn:hover,.map-switch.open .map-switch-btn{color:#fff;border-color:#00ff66}
.map-switch-btn b{font-weight:600;color:#9dff6b;letter-spacing:.06em;font-size:10px}
.map-switch-list{display:none;position:absolute;left:0;top:calc(100% + 8px);width:210px;padding:6px;border-radius:16px;
  border:1px solid rgba(0,255,102,.3);background:rgba(2,10,6,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:4px 4px 12px rgba(0,0,0,.5);flex-direction:column;gap:3px}
.map-switch.open .map-switch-list{display:flex}
.map-switch-list button{border:0;border-radius:12px;padding:10px 12px;cursor:pointer;color:#8fc9a5;text-align:left;white-space:nowrap;
  font:inherit;letter-spacing:.08em;background:transparent}
.map-switch-list button:hover{color:#fff;background:rgba(255,255,255,.06)}
.map-switch-list button.on{color:#021008;background:linear-gradient(145deg,#00ff66,#9dff6b)}
.map-switch-list button:disabled{opacity:.4;cursor:not-allowed}
.map-switch-list button.busy{opacity:.7}
.map-switch-x{align-self:flex-end;border:0;background:transparent;color:#8fc9a5;cursor:pointer;font-size:15px;padding:2px 8px;border-radius:10px}
.map-switch-x:hover{color:#fff;background:rgba(255,255,255,.08)}
body.cockpit-mode .map-switch{display:none}
@media (max-width:760px){.map-switch{left:150px;top:96px}.map-switch-btn{padding:9px 12px}}
`;

/**
 * One small "MAP" button. Click it for the list of base maps (Google 3D city,
 * Bing Aerial, Aerial + Names, Esri Satellite, Voyager street map); click it
 * again, the ✕, an option or anywhere else to put the list away. Reads the map
 * controller, so it follows automatic fallbacks too.
 */
export function mountMapSwitch(controller) {
  if (!controller || document.querySelector('.map-switch')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const box = document.createElement('div');
  box.className = 'map-switch';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'map-switch-btn';
  toggle.title = 'Choose the base map';
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-expanded', 'false');
  const word = document.createElement('span');
  word.textContent = 'MAP';
  const current = document.createElement('b');
  toggle.append(word, current);
  const list = document.createElement('div');
  list.className = 'map-switch-list';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', 'Base map');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'map-switch-x';
  close.textContent = '✕';
  close.title = 'Close';
  close.setAttribute('aria-label', 'Close the map list');
  list.append(close);
  box.append(toggle, list);
  const buttons = new Map();

  const setOpen = (open) => {
    box.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  const onDocClick = (event) => {
    if (!box.contains(event.target)) setOpen(false);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') setOpen(false);
  };
  toggle.onclick = () => setOpen(!box.classList.contains('open'));
  close.onclick = () => setOpen(false);
  document.addEventListener('pointerdown', onDocClick, true);
  document.addEventListener('keydown', onKey);

  const sync = () => {
    const active = controller.getActiveId?.();
    const stacks = controller.getStacks?.() ?? [];
    for (const [id, button] of buttons) {
      const stack = stacks.find((s) => s.id === id);
      button.classList.toggle('on', id === active);
      const unavailable = stack && stack.available === false;
      button.disabled = Boolean(unavailable);
      button.title = unavailable
        ? (stack.unavailableReason ?? 'Not available')
        : '';
    }
    current.textContent =
      OPTIONS.find((o) => o.id === active)?.label.toUpperCase() ?? '';
  };

  for (const option of OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label;
    button.onclick = async () => {
      button.classList.add('busy');
      setOpen(false);
      try {
        await controller.setStack(option.id);
      } catch (error) {
        console.warn('Map switch failed:', error);
      } finally {
        button.classList.remove('busy');
        sync();
      }
    };
    buttons.set(option.id, button);
    list.append(button);
  }
  document.body.append(box);
  sync();
  const unsubscribe = controller.subscribe?.(sync);
  return () => {
    unsubscribe?.();
    document.removeEventListener('pointerdown', onDocClick, true);
    document.removeEventListener('keydown', onKey);
    box.remove();
    style.remove();
  };
}
