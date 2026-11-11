import * as Cesium from 'cesium';

// Web Mercator maps (Bing, Esri, street map) stop at about 85.05 degrees of
// latitude. Past that the globe stretches the last row of tiles into a pale disc
// with streaks around each pole. A real NASA picture of each pole (Blue Marble
// from NASA GIBS, saved in /textures) is laid over just those two caps, so the
// disc is never seen.
const CAP_EDGE = 84.5;

const CAPS = [
  {
    url: '/textures/polar-south.jpg',
    rectangle: Cesium.Rectangle.fromDegrees(-180, -90, 180, -CAP_EDGE),
  },
  {
    url: '/textures/polar-north.jpg',
    rectangle: Cesium.Rectangle.fromDegrees(-180, CAP_EDGE, 180, 90),
  },
];

/**
 * Adds the two polar cap layers on top of the base map. A base-map switch only
 * changes the layer beneath them, so they stay.
 */
export function mountPolarCaps(viewer) {
  if (!viewer?.imageryLayers) return null;
  const layers = [];
  let gone = false;
  for (const cap of CAPS) {
    Cesium.SingleTileImageryProvider.fromUrl(cap.url, {
      rectangle: cap.rectangle,
      credit: 'Polar imagery: NASA GIBS, Blue Marble',
    })
      .then((provider) => {
        if (gone || viewer.isDestroyed?.()) return;
        const layer = viewer.imageryLayers.addImageryProvider(provider);
        layers.push(layer);
      })
      .catch((error) => console.warn('Polar cap unavailable:', error));
  }
  return () => {
    gone = true;
    for (const layer of layers) {
      if (!viewer.isDestroyed?.()) viewer.imageryLayers.remove(layer, true);
    }
  };
}
