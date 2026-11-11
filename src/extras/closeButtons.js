// Gives every collapsible panel of the app a clear "close" button. The app's
// own toggle is a small arrow or plus; this adds a labelled cross next to it
// that does the same thing, shown only while the panel is open.
const CSS = `
.tn-close{flex:none;width:28px;height:28px;margin-left:6px;border:0;border-radius:50%;cursor:pointer;color:#c8ffd9;
  font:600 13px/1 'JetBrains Mono',ui-monospace,monospace;background:linear-gradient(145deg,rgba(14,38,22,.92),rgba(4,16,9,.92));
  box-shadow:3px 3px 7px rgba(0,0,0,.45)}
.tn-close:hover,.tn-close:focus-visible{color:#fff;background:#b3263e;outline:none}
.tn-close[hidden]{display:none}
`;

function panelName(button) {
  return (
    (button.getAttribute('aria-label') || button.title || 'panel')
      .replace(/^(Expand|Collapse)\s+/i, '')
      .trim() || 'panel'
  );
}

function scan(root) {
  for (const button of root.querySelectorAll(
    '.panel-collapse-btn[data-collapse-target]',
  )) {
    let x = button.nextElementSibling;
    if (!x?.classList?.contains('tn-close')) {
      x = document.createElement('button');
      x.type = 'button';
      x.className = 'tn-close';
      x.textContent = '✕';
      x.onclick = (event) => {
        event.stopPropagation();
        if (button.getAttribute('aria-expanded') === 'true') button.click();
      };
      button.after(x);
    }
    const name = panelName(button);
    x.title = `Close ${name}`;
    x.setAttribute('aria-label', `Close ${name}`);
    x.hidden = button.getAttribute('aria-expanded') !== 'true';
  }
}

/** Keep a close button on every collapsible panel, including ones that mount later. */
export function mountCloseButtons() {
  if (document.getElementById('tn-close-style')) return;
  const style = document.createElement('style');
  style.id = 'tn-close-style';
  style.textContent = CSS;
  document.head.append(style);
  let queued = false;
  const run = () => {
    queued = false;
    scan(document);
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(run);
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-expanded'],
  });
  scan(document);
  return () => {
    observer.disconnect();
    style.remove();
    for (const x of document.querySelectorAll('.tn-close')) x.remove();
  };
}
