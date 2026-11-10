import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';
import { t } from './i18n/index.js';

// The Vite boundary exposes only undefined, null, or a validated URL.
const photonSetting = import.meta.env.PHOTON_URL;

const application = createStandaloneApplication({
  googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
  cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
  geospatial:
    photonSetting === undefined ? {} : { endpoints: { photon: photonSetting } },
  allowQaRegistration: import.meta.env.DEV,
});

application
  .start()
  .then((components) => {
    // Atlas Eye extras: live alerts feed and a watchlist over the running globe.
    // A failure here must not take down the globe, so it is handled separately.
    Promise.all([
      import('./extras/alertsPanel.js'),
      import('./extras/explorePanel.js'),
    ])
      .then(([{ mountAlertsPanel }, { createExploreTab }]) => {
        const { viewer } = components.scene;
        mountAlertsPanel(viewer, { extraTabs: [createExploreTab(viewer)] });
      })
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
