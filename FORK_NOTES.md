# Meridian SkyNet (fork notes)

This is a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by Bilawal Sidhu, used under the MIT License (see `LICENSE`, unchanged).

## What changed

- Renamed to Meridian SkyNet: page title, loading screen, top bar, web manifest.
- New **ALERTS** panel (bottom-left), in `src/extras/`:
  - Live feed of USGS earthquakes (M4.5+, last day) and open NASA EONET events (wildfires, storms, volcanoes, floods), refreshed every 5 minutes. Pins are drawn on the globe; clicking a row flies there.
  - **Watchlist**: save the current view as a named place with a radius in km. Events inside a radius are highlighted, counted in the badge, and sent as browser notifications.
  - Watchlist is stored in `localStorage` only.
- `src/extras/alertsCore.js` is pure logic with tests in `alertsCore.test.mjs` (`node --test src/extras/alertsCore.test.mjs`).
- The panel is mounted from `src/main.js` after the app starts; if it fails to load, the globe still runs.

## Run

    npm ci
    npm run dev

Open http://localhost:4173.

## Added later

- GDACS global disaster alerts (Orange/Red events, plus Green cyclones, floods and volcanoes) join the Alerts feed.
- **Space** tab: NOAA SWPC planetary Kp index with storm level, recent solar flares (M/X class highlighted), and a toggleable aurora probability overlay on the globe.

## Added after that

- **Phone layout:** under 640 px wide the panel becomes a full-width bottom sheet with larger tap targets.
- **Offline cache:** the last good alerts, Kp and flares are saved in `localStorage` and shown immediately on load. If every live feed fails, an "Offline: showing data saved ... ago" banner appears, and it clears when a feed works again.
- **Sky above your view** (Space tab): live Sun, Moon (with lit percentage), Mercury to Neptune: altitude and compass direction for the point under the screen centre, computed in the browser with `astronomy-engine`. Refreshes every minute.

Not added: ocean buoys (NDBC) and airport weather (METAR). Their servers do not allow direct browser requests, so they would need a small proxy on the dev server.
Also not added: live new-exoplanet discoveries. The NASA Exoplanet Archive does not allow direct browser requests, so it would also need a server proxy.
