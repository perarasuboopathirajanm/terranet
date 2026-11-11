import { openCosmos } from './cosmosView.js';
import { zoomOutLimit } from '../app/viewer.js';

const CSS = `
.cosmos-launch{position:fixed;left:60px;top:126px;z-index:60;display:flex;align-items:center;gap:8px;border:1px solid rgba(0,255,102,.35);
  border-radius:16px;padding:10px 16px;cursor:pointer;color:#c8ffd9;font:600 12px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.2em;
  background:linear-gradient(145deg,rgba(14,38,22,.92),rgba(4,16,9,.92));box-shadow:4px 4px 12px rgba(0,0,0,.5),0 0 14px rgba(0,255,102,.18)}
.cosmos-launch:hover{color:#fff;border-color:#00ff66}
.cosmos-launch i{width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe36b,#ff9d2e);box-shadow:0 0 8px #ffe36b}
body.cockpit-mode .cosmos-launch{display:none}
@media (max-width:640px){.cosmos-launch{left:12px;top:96px;padding:9px 12px}}
`;

// Zooming out to this share of the furthest the globe allows opens the galaxy.
const OPEN_AT = 0.9;
// The camera must come back below this share before it can open again.
const REARM_AT = 0.8;

/**
 * A button on the main screen that opens the Cosmos map (Sun, planets, galaxy).
 * Zooming the globe all the way out opens it too, on the Milky Way view.
 */
export function mountCosmosButton(viewer = null) {
  if (document.querySelector('.cosmos-launch')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const button = document.createElement('button');
  button.className = 'cosmos-launch';
  button.type = 'button';
  button.title = 'Open the Sun, planets, galaxy and distance map';
  const dot = document.createElement('i');
  const text = document.createElement('span');
  text.textContent = 'COSMOS';
  button.append(dot, text);
  let close = null;
  const open = (preset) => {
    if (document.querySelector('.cosmos')) return;
    close = openCosmos({
      preset,
      onClose: () => {
        close = null;
        // Step back in so the next zoom-out opens it again, not instantly.
        try {
          const h = viewer?.camera?.positionCartographic?.height;
          if (Number.isFinite(h)) viewer.camera.zoomIn(h * 0.35);
        } catch {
          /* the camera stays where it is */
        }
      },
    });
  };
  button.onclick = () => open('Solar system');
  document.body.append(button);

  let removeListener = null;
  if (viewer?.scene?.preRender) {
    let armed = true;
    let lastCheck = 0;
    const ratio = () => {
      const h = viewer.camera.positionCartographic?.height;
      const limit = zoomOutLimit(viewer.camera.frustum.fovy);
      return Number.isFinite(h) && limit > 0 ? h / limit : 0;
    };
    armed = ratio() < REARM_AT; // a view that starts far out must zoom in first
    removeListener = viewer.scene.preRender.addEventListener(() => {
      const now = performance.now();
      if (now - lastCheck < 250) return;
      lastCheck = now;
      const r = ratio();
      if (!armed) {
        if (r < REARM_AT) armed = true;
        return;
      }
      if (r >= OPEN_AT && !document.querySelector('.cosmos')) {
        armed = false;
        open('Milky Way');
      }
    });
  }

  return () => {
    removeListener?.();
    close?.();
    button.remove();
    style.remove();
  };
}
