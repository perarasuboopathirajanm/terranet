// Glass and soft-UI ("neumorphic") theme for the Terranet panel, in an alien
// aqua and violet palette. Shared by the alerts panel and its extra tabs.

export const STYLE = `
.atlas-panel{--aq:#6ef3d6;--vi:#a78bfa;--ink:#dff7f1;--mute:#7fa1a0;
  position:fixed;left:16px;bottom:16px;width:340px;max-height:58vh;display:flex;flex-direction:column;z-index:40;
  color:var(--ink);font:12px/1.45 'JetBrains Mono',ui-monospace,monospace;border-radius:22px;
  background:linear-gradient(145deg,rgba(22,34,44,.58),rgba(9,13,22,.72));
  backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(110,243,214,.22);
  box-shadow:10px 14px 30px rgba(0,0,0,.5),-6px -6px 20px rgba(110,243,214,.05),inset 1px 1px 0 rgba(255,255,255,.09)}
.atlas-panel.collapsed .atlas-body{display:none}
.atlas-head{display:flex;align-items:center;gap:8px;padding:11px 14px;cursor:pointer;user-select:none}
.atlas-head b{flex:1;letter-spacing:.22em;font-weight:600;
  background:linear-gradient(90deg,var(--aq),var(--vi));-webkit-background-clip:text;background-clip:text;color:transparent}
.atlas-badge{background:linear-gradient(135deg,#ff6b8b,#c0392b);color:#fff;border-radius:10px;padding:0 7px;font-size:11px;
  box-shadow:0 0 12px rgba(255,107,139,.55)}
.atlas-badge.zero{display:none}
.atlas-tabs{display:flex;gap:6px;padding:4px 10px 8px;overflow-x:auto;scrollbar-width:none}
.atlas-tabs button,.atlas-chip{flex:1 0 auto;border:0;border-radius:12px;padding:7px 10px;color:var(--mute);cursor:pointer;font:inherit;
  background:linear-gradient(145deg,rgba(34,50,62,.9),rgba(14,20,30,.9));
  box-shadow:4px 4px 9px rgba(0,0,0,.45),-3px -3px 7px rgba(110,243,214,.06)}
.atlas-tabs button.on,.atlas-chip.on{color:var(--aq);
  background:linear-gradient(145deg,rgba(10,15,24,.95),rgba(24,36,48,.9));
  box-shadow:inset 3px 3px 7px rgba(0,0,0,.6),inset -2px -2px 6px rgba(110,243,214,.08)}
.atlas-list{overflow-y:auto;padding:4px 10px 10px;min-height:60px;scrollbar-width:thin;scrollbar-color:rgba(110,243,214,.3) transparent}
.atlas-row{display:flex;gap:10px;padding:9px 12px;margin:0 0 7px;cursor:pointer;align-items:flex-start;border-radius:14px;
  background:linear-gradient(145deg,rgba(12,18,28,.7),rgba(26,38,50,.55));
  box-shadow:inset 2px 2px 6px rgba(0,0,0,.45),inset -2px -2px 5px rgba(110,243,214,.05);transition:box-shadow .15s}
.atlas-row:hover{box-shadow:inset 2px 2px 6px rgba(0,0,0,.45),0 0 14px rgba(110,243,214,.25)}
.atlas-row.hit{box-shadow:inset 2px 2px 6px rgba(0,0,0,.45),0 0 0 1px rgba(255,107,139,.6),0 0 14px rgba(255,107,139,.25)}
.atlas-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex:none;box-shadow:0 0 9px currentColor}
.atlas-sub{color:var(--mute);font-size:11px;padding:2px 2px 4px}
.atlas-row .atlas-sub{padding:0}
.atlas-row button{margin-left:auto;background:none;border:0;color:var(--mute);cursor:pointer}
.atlas-form{display:grid;grid-template-columns:1fr 70px;gap:8px;padding:8px 2px}
.atlas-form input,.atlas-form button,.atlas-search{border:0;border-radius:12px;padding:8px 10px;font:inherit;color:var(--ink);
  background:rgba(8,12,20,.8);box-shadow:inset 3px 3px 7px rgba(0,0,0,.55),inset -2px -2px 6px rgba(110,243,214,.06)}
.atlas-form button{grid-column:1 / -1;cursor:pointer;color:#062a24;font-weight:600;
  background:linear-gradient(135deg,var(--aq),var(--vi));box-shadow:4px 4px 10px rgba(0,0,0,.45),0 0 14px rgba(110,243,214,.3)}
.atlas-search{width:100%;margin:2px 0 8px}
.atlas-chips{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px}
.atlas-empty{padding:10px;color:var(--mute)}
.atlas-banner{padding:8px 12px;margin:0 0 8px;border-radius:12px;background:rgba(255,107,139,.14);color:#ffc3d0;font-size:11px}
.atlas-skel{height:46px;margin:0 0 7px;border-radius:14px;
  background:linear-gradient(100deg,rgba(255,255,255,.04) 30%,rgba(110,243,214,.16) 50%,rgba(255,255,255,.04) 70%);
  background-size:220% 100%;animation:atlas-shimmer 1.4s ease-in-out infinite;
  box-shadow:inset 2px 2px 6px rgba(0,0,0,.4)}
@keyframes atlas-shimmer{from{background-position:120% 0}to{background-position:-120% 0}}
@media (prefers-reduced-motion:reduce){.atlas-skel{animation:none}}
.atlas-reticle{position:fixed;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;z-index:39;pointer-events:none;
  border:1px solid var(--aq,#6ef3d6);box-shadow:0 0 22px rgba(110,243,214,.55),inset 0 0 18px rgba(167,139,250,.35);
  animation:atlas-pulse 1.8s ease-in-out infinite}
.atlas-reticle span{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:10px;white-space:nowrap;
  padding:4px 10px;border-radius:10px;color:#dff7f1;font:12px 'JetBrains Mono',monospace;
  background:rgba(10,15,24,.7);backdrop-filter:blur(10px);border:1px solid rgba(110,243,214,.3)}
@keyframes atlas-pulse{50%{transform:scale(1.12);opacity:.7}}
@media (max-width:640px){
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
