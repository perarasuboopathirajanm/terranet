# 🌐 Terranet

A live 3D globe in your browser: aircraft, satellites, earthquakes, weather, radio, cameras and a map of the whole cosmos, with real NASA and ESA pictures.

**Live site:** https://terranet.terranet-dev.workers.dev

---

## What's new in Terranet

1. Terranet name, green glass look, smaller header
2. Alerts panel with a watchlist and an Explore tab; the list scrolls inside its box
3. Live flights, with a nearby-aircraft fallback
4. Wind, with a backup source when the main one can't run
5. Rain radar, satellite clouds and lightning
6. Radio stations
7. Cyclones, fire perimeters, GNSS integrity, drone airspace, whale sightings, FIRMS fires, TomTom traffic and a saved list of launches
8. COSMOS: real NASA and ESA pictures of the planets, Moon, stars, black holes and galaxies
9. COSMOS Lineup view: the planets in a row, click one for a real picture
10. Earth shown as the NASA Blue Marble photo
11. Satellite pictures on click (Hubble, ISS, Soyuz, Landsat, Fermi, Swift, TESS, GPS, Starlink)
12. One MAP button: 3D City, Bing Aerial, Aerial + Names, Esri Satellite, Voyager
13. Polar caps over the white disc at the poles
14. A fixed button layout that stays fully inside the window

Pictures are NASA/ESA public domain or CC BY / CC0, with credits in each caption. Some are artist's concepts, or were taken by a satellite rather than of it, and the captions say so.

---

## Run it

Needs Node 24.14 or newer.

```bash
npm ci
npm run dev
```

Open http://localhost:4173.

Optional keys (Google Maps, Cesium ion, OpenSky and others) go in a git-ignored `.env.local`; copy `.env.example` as a starting point. The globe starts without any keys.

## Deploy to Cloudflare Workers

```bash
npm run cf:deploy
```

You need your own Cloudflare account. Keys are stored as Worker secrets (`npx wrangler secret put NAME`), never in the repository.

---

## About this project

Terranet is an open-source project, released under the MIT License (see `LICENSE`). It was inspired by [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), and it adds new features on top of that idea. It is still growing, and in the future it can get better: more live sources, more accurate data, more pictures and a smoother layout. Ideas and pull requests are welcome.
