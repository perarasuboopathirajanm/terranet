import * as Cesium from 'cesium';
import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
import { t } from './i18n/index.js';
import { isScopeMaskEnabled, setScopeMaskEnabled } from './scopeMask.js';

// The Vite boundary exposes only undefined, null, or a validated URL.
const photonSetting = import.meta.env.PHOTON_URL;

// Open over Japan: put that view in the address before the app starts, so the
// app restores it as its own first view. A /share/ link keeps its own view.
if (!window.location.pathname.startsWith('/share')) {
  try {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}#lat=36&lon=138&alt=4500000&heading=0&pitch=-90&roll=0`,
    );
  } catch {
    /* the app then opens at its default view */
  }
}

let dataManager = null;

/**
 * The round "scope" lens is removed for good. Saved settings and share links
 * (sc=1) switch it back on after start, so turn it off again whenever that
 * happens.
 */
let scopeWatch = null;
function keepScopeOff() {
  const off = () => {
    if (isScopeMaskEnabled()) setScopeMaskEnabled(false);
  };
  off();
  if (scopeWatch || typeof MutationObserver === 'undefined') return;
  scopeWatch = new MutationObserver(off);
  scopeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-scope-mask'],
  });
}
keepScopeOff();

const application = createStandaloneApplication({
  onData: (manager) => {
    dataManager = manager;
  },
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  geospatial:
    photonSetting === undefined ? {} : { endpoints: { photon: photonSetting } },
  allowQaRegistration: import.meta.env.DEV,
});

/**
 * First look: over Japan, with satellites and the Starlink shell switched on.
 * A shared /share/ link keeps its own view, and the layers are only
 * turned on the first time so later visits keep the user's own choices.
 */
function applyTerranetStart(_viewer, manager) {
  try {
    let seen = false;
    try {
      seen = localStorage.getItem('terranet:started') === '1';
      localStorage.setItem('terranet:started', '1');
    } catch {
      /* private mode: just treat it as a first visit */
    }
    // The round "scope" lens darkens everything outside a circle and made the
    // city look like it was seen through a tube. Switch it off once; the
    // Display settings can turn it back on.
    keepScopeOff();
    if (seen || !manager) return;
    Promise.resolve(manager.setEnabled('satellites', true, { origin: 'user' }))
      .then(() =>
        manager.setLayerParams(
          'satellites',
          { catalog: 'dense' },
          { origin: 'user' },
        ),
      )
      .catch((error) => console.warn('Terranet start layers failed:', error));
  } catch (error) {
    console.warn('Terranet start view failed:', error);
  }
}

application
  .start()
  .then((components) => {
    // Atlas Eye extras: live alerts feed and a watchlist over the running globe.
    // A failure here must not take down the globe, so it is handled separately.
    Promise.all([
      import('./extras/alertsPanel.js'),
      import('./extras/explorePanel.js'),
      import('./extras/cosmosButton.js'),
      import('./extras/mapSwitch.js'),
      import('./extras/closeButtons.js'),
      import('./extras/polarCaps.js'),
    ])
      .then(
        ([
          { mountAlertsPanel },
          { createExploreTab },
          { mountCosmosButton },
          { mountMapSwitch },
          { mountCloseButtons },
          { mountPolarCaps },
        ]) => {
          const { viewer, mapStackController } = components.scene;
          // For debugging in the browser console.
          window.__terranetViewer = viewer;
          applyTerranetStart(viewer, dataManager);
          mountCosmosButton(viewer);
          mountMapSwitch(mapStackController);
          mountCloseButtons();
          mountPolarCaps(viewer);
          mountAlertsPanel(viewer, {
            extraTabs: [createExploreTab(viewer, { dataManager })],
          });
        },
      )
      .catch((error) => console.error('Atlas Eye extras failed:', error));
  })
  .catch((error) => {
    console.error('Atlas Eye initialization failed:', error);
    const loaderStatus = document.querySelector(
      '#loading-screen .loader-status',
    );
    loaderStatus.textContent = t('Error: {message}', {
      message: describeError(error),
    });
    loaderStatus.style.color = '#ff4444';
  });

export { application };
