# 領域展開 (fork notes)

This is a fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by Bilawal Sidhu, used under the MIT License (see `LICENSE`, unchanged).

## What changed

- Renamed to 領域展開: page title, loading screen, top bar, web manifest.
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
