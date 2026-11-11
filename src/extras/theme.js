// Glass and soft-UI ("neumorphic") theme for the Terranet panel, in an alien
// aqua and violet palette. Shared by the alerts panel and its extra tabs.

export const STYLE = `
.atlas-panel{--aq:#00ff66;--vi:#9dff6b;--ink:#c8ffd9;--mute:#6fae86;
  position:fixed;left:16px;top:96px;bottom:auto;width:300px;max-height:calc(100vh - 150px);min-height:0;height:auto;display:flex;flex-direction:column;z-index:40;
  color:var(--ink);font:11px/1.4 'JetBrains Mono',ui-monospace,monospace;border-radius:18px;
  background:linear-gradient(145deg,rgba(8,26,14,.58),rgba(2,10,6,.72));
  backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(0,255,102,.22);
  box-shadow:10px 14px 30px rgba(0,0,0,.5),-6px -6px 20px rgba(0,255,102,.05),inset 1px 1px 0 rgba(255,255,255,.09)}
.atlas-panel.collapsed{top:auto;bottom:46px}
.atlas-panel.collapsed .atlas-body{display:none}
.atlas-panel.collapsed .atlas-x{display:none}
.atlas-x,.cosmos-x{width:28px;height:28px;flex:none;border:0;border-radius:50%;cursor:pointer;color:#c8ffd9;font:600 13px/1 inherit;
  background:linear-gradient(145deg,rgba(14,38,22,.9),rgba(4,16,9,.9));box-shadow:3px 3px 7px rgba(0,0,0,.45)}
.atlas-x:hover,.cosmos-x:hover{color:#fff;background:#b3263e}
.cosmos-card,.cosmos-facts{padding-right:44px}
.cosmos-x{position:absolute;top:8px;right:8px}
.atlas-head{display:flex;align-items:center;gap:8px;padding:11px 14px;cursor:pointer;user-select:none}
.atlas-head b{flex:1;letter-spacing:.22em;font-weight:600;
  background:linear-gradient(90deg,var(--aq),var(--vi));-webkit-background-clip:text;background-clip:text;color:transparent}
.atlas-badge{background:linear-gradient(135deg,#ff6b8b,#c0392b);color:#fff;border-radius:10px;padding:0 7px;font-size:11px;
  box-shadow:0 0 12px rgba(255,107,139,.55)}
.atlas-badge.zero{display:none}
.atlas-tabs{display:flex;gap:6px;padding:4px 10px 8px;overflow-x:auto;scrollbar-width:none}
.atlas-tabs button,.atlas-chip{flex:1 0 auto;border:0;border-radius:12px;padding:7px 10px;color:var(--mute);cursor:pointer;font:inherit;
  background:linear-gradient(145deg,rgba(14,38,22,.9),rgba(4,16,9,.9));
  box-shadow:4px 4px 9px rgba(0,0,0,.45),-3px -3px 7px rgba(0,255,102,.06)}
.atlas-tabs button.on,.atlas-chip.on{color:var(--aq);
  background:linear-gradient(145deg,rgba(3,12,7,.95),rgba(10,30,18,.9));
  box-shadow:inset 3px 3px 7px rgba(0,0,0,.6),inset -2px -2px 6px rgba(0,255,102,.08)}
.atlas-list{overflow-y:auto;padding:4px 10px 10px;min-height:60px;scrollbar-width:thin;scrollbar-color:rgba(0,255,102,.3) transparent}
.atlas-row{display:flex;gap:10px;padding:9px 12px;margin:0 0 7px;cursor:pointer;align-items:flex-start;border-radius:14px;
  background:linear-gradient(145deg,rgba(4,16,9,.7),rgba(10,30,18,.55));
  box-shadow:inset 2px 2px 6px rgba(0,0,0,.45),inset -2px -2px 5px rgba(0,255,102,.05);transition:box-shadow .15s}
.atlas-row:hover{box-shadow:inset 2px 2px 6px rgba(0,0,0,.45),0 0 14px rgba(0,255,102,.25)}
.atlas-row.hit{box-shadow:inset 2px 2px 6px rgba(0,0,0,.45),0 0 0 1px rgba(255,107,139,.6),0 0 14px rgba(255,107,139,.25)}
.atlas-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex:none;box-shadow:0 0 9px currentColor}
.atlas-sub{color:var(--mute);font-size:11px;padding:2px 2px 4px}
.atlas-row .atlas-sub{padding:0}
.atlas-row button{margin-left:auto;background:none;border:0;color:var(--mute);cursor:pointer}
.atlas-form{display:grid;grid-template-columns:1fr 70px;gap:8px;padding:8px 2px}
.atlas-form input,.atlas-form button,.atlas-search{border:0;border-radius:12px;padding:8px 10px;font:inherit;color:var(--ink);
  background:rgba(2,10,6,.8);box-shadow:inset 3px 3px 7px rgba(0,0,0,.55),inset -2px -2px 6px rgba(0,255,102,.06)}
.atlas-form button{grid-column:1 / -1;cursor:pointer;color:#02140a;font-weight:600;
  background:linear-gradient(135deg,var(--aq),var(--vi));box-shadow:4px 4px 10px rgba(0,0,0,.45),0 0 14px rgba(0,255,102,.3)}
.atlas-search{width:100%;margin:2px 0 8px}
.atlas-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.atlas-empty{padding:10px;color:var(--mute)}
.atlas-banner{padding:8px 12px;margin:0 0 8px;border-radius:12px;background:rgba(255,107,139,.14);color:#ffc3d0;font-size:11px}
.atlas-skel{height:46px;margin:0 0 7px;border-radius:14px;
  background:linear-gradient(100deg,rgba(255,255,255,.04) 30%,rgba(0,255,102,.16) 50%,rgba(255,255,255,.04) 70%);
  background-size:220% 100%;animation:atlas-shimmer 1.4s ease-in-out infinite;
  box-shadow:inset 2px 2px 6px rgba(0,0,0,.4)}
@keyframes atlas-shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
@media (prefers-reduced-motion:reduce){.atlas-skel{animation:none}}
.atlas-reticle{position:fixed;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;z-index:39;pointer-events:none;
  border:1px solid var(--aq,#00ff66);box-shadow:0 0 22px rgba(0,255,102,.55),inset 0 0 18px rgba(157,255,107,.35);
  animation:atlas-pulse 1.8s ease-in-out infinite}
.atlas-reticle span{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:10px;white-space:nowrap;
  padding:4px 10px;border-radius:10px;color:#c8ffd9;font:12px 'JetBrains Mono',monospace;
  background:rgba(3,12,7,.7);backdrop-filter:blur(10px);border:1px solid rgba(0,255,102,.3)}
@keyframes atlas-pulse{50%{transform:scale(1.12);opacity:.7}}
.atlas-thumb{width:46px;height:46px;object-fit:cover;border-radius:10px;flex:none;box-shadow:3px 3px 8px rgba(0,0,0,.5)}
.atlas-card{position:fixed;right:16px;top:90px;width:300px;z-index:41;border-radius:20px;overflow:hidden;color:var(--ink,#c8ffd9);
  font:12px/1.45 'JetBrains Mono',ui-monospace,monospace;background:linear-gradient(145deg,rgba(8,26,14,.7),rgba(2,10,6,.85));
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(0,255,102,.25);box-shadow:10px 14px 30px rgba(0,0,0,.5)}
.atlas-card img{display:block;width:100%;max-height:200px;object-fit:cover}
.atlas-card-label{padding:10px 14px}
.atlas-card button{position:absolute;top:8px;right:8px;width:28px;height:28px;border:0;border-radius:50%;cursor:pointer;color:#c8ffd9;
  background:rgba(2,10,6,.7)}
.atlas-open{width:100%;border:0;border-radius:14px;padding:11px;font:inherit;font-weight:600;cursor:pointer;color:#02140a;
  background:linear-gradient(135deg,var(--aq),var(--vi));box-shadow:4px 4px 10px rgba(0,0,0,.45),0 0 14px rgba(0,255,102,.3)}
.cosmos{position:fixed;inset:0;z-index:2000;color:#c8ffd9;font:12px/1.45 'JetBrains Mono',ui-monospace,monospace;background:#010503}
.cosmos canvas{position:absolute;inset:0;touch-action:none;cursor:grab}
.cosmos-head{position:absolute;left:0;right:0;top:0;display:flex;gap:10px;align-items:center;padding:12px 16px;flex-wrap:wrap;
  background:linear-gradient(rgba(2,10,6,.85),transparent)}
.cosmos-head b{letter-spacing:.3em;color:#00ff66}
.cosmos-presets{display:flex;gap:6px;flex:1;flex-wrap:wrap}
.cosmos-head button{border:0;border-radius:12px;padding:7px 11px;color:#c8ffd9;cursor:pointer;font:inherit;
  background:linear-gradient(145deg,rgba(14,38,22,.9),rgba(4,16,9,.9));box-shadow:4px 4px 9px rgba(0,0,0,.45),-3px -3px 7px rgba(0,255,102,.06)}
.cosmos-facts{position:absolute;left:16px;top:64px;width:min(380px,calc(100vw - 32px));padding:12px 14px;border-radius:18px;
  background:rgba(2,10,6,.6);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(0,255,102,.2);color:#a0e6b9}
.cosmos-card{display:none;position:absolute;right:16px;top:64px;width:min(300px,calc(100vw - 32px));padding:12px 14px;border-radius:18px;
  background:rgba(2,10,6,.7);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(0,255,102,.3)}
.cosmos-card-title{font-weight:600;color:#fff;font-size:14px}
.cosmos-readout{position:absolute;right:16px;bottom:16px;color:#a0e6b9}
.cosmos-time{position:absolute;left:50%;transform:translateX(-50%);bottom:14px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;
  justify-content:center;max-width:calc(100vw - 24px);padding:8px 10px;border-radius:16px;background:rgba(2,10,6,.65);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(0,255,102,.25)}
.cosmos-time button,.cosmos-time select{border:0;border-radius:10px;padding:6px 10px;color:#c8ffd9;cursor:pointer;font:inherit;
  background:linear-gradient(145deg,rgba(14,38,22,.9),rgba(4,16,9,.9))}
.cosmos-time label{display:flex;align-items:center;gap:6px;color:#9dff6b}.cosmos-time input[type=range]{width:90px;accent-color:#00ff66}
.cosmos-time span{color:#9dff6b;min-width:150px;text-align:center}
.cosmos-card-row{color:#a0e6b9}
.cosmos-card .cosmos-portrait{position:static;inset:auto;display:block;width:100%;max-width:240px;max-height:240px;object-fit:cover;aspect-ratio:1;margin:0 auto 8px;border-radius:14px}
.cosmos-card-sub{margin-top:8px;color:#9dff6b;font-weight:600}
.cosmos-card .cosmos-photo{cursor:zoom-in;object-fit:contain;background:#000}
.cosmos-lightbox{position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  padding:56px 16px 16px;background:rgba(0,4,2,.92);cursor:zoom-out}
.cosmos-lightbox img{max-width:min(92vw,1100px);max-height:78vh;object-fit:contain;border-radius:12px;cursor:default;background:#000}
.cosmos-lightbox .cosmos-credit{max-width:min(92vw,720px);text-align:center;cursor:default}
.cosmos-credit{margin-top:6px;font-size:11px;color:#6fae88}
@media (max-width:640px){
  .atlas-card{left:8px;right:8px;top:70px;width:auto}
  .atlas-panel{left:8px;right:8px;bottom:8px;width:auto;max-height:64vh;font-size:14px;border-radius:24px;
    padding-bottom:env(safe-area-inset-bottom)}
  .atlas-head{padding:14px 16px}
  .atlas-tabs button,.atlas-chip{padding:12px 14px}
  .atlas-row{padding:13px 14px}
  .atlas-row button{padding:8px 12px}
  .atlas-sub{font-size:12px}
  .atlas-form{grid-template-columns:1fr 80px}
  .atlas-form input,.atlas-form button,.atlas-search{padding:11px;font-size:16px}
}
`;

/** `count` placeholder rows that shimmer while real data loads. */
export function skeletonRows(createElement, count = 5) {
  return Array.from({ length: count }, () =>
    createElement('div', { className: 'atlas-skel' }),
  );
}
