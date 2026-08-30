    # Streamflix on LG webOS 6

This is the existing Streamflix UI with a webOS compatibility layer. The UI is not replaced.

## Required environment

Create `.env` from `.env.example` and set `VITE_TMDB_API_KEY` before building. The original project requires this key for TMDB data.

## Build webOS app

```bash
npm ci
npm run build
node scripts/webos-package.js
cd dist
ares-package --no-minify .
```

Install:

```bash
ares-install -d MovieBoxTV ./com.streamflix.webos_1.0.1_all.ipk
ares-launch -d MovieBoxTV com.streamflix.webos
```

## Navigation fixes

- LG key codes 37/38/39/40, 13, 461/10009, 10082 and 10252 are normalized.
- Exactly one DOM element can be marked `data-focused=true`.
- Arrow movement uses visible-element geometry instead of stale focus state.
- Route changes restore the previous focus where possible.
- Magic Remote mouseover/mousedown updates the same focus state.
- BACK closes overlays before navigating browser history.
- Chromium 79 is the Vite/esbuild build target.

The existing Streamflix UI/components remain in place.
