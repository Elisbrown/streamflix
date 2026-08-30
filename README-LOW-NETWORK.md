# Streamflix TV low-network runtime

This branch keeps the existing Streamflix UI and hardens the client for LG webOS 6 and unreliable networks.

## Client-side behavior

- Catalog, search, detail, and trailer metadata are cached in memory and localStorage.
- Fresh cached data is returned immediately.
- Older-but-usable cached data can be returned immediately while a background refresh runs.
- Offline mode serves cached data rather than waiting on network timeouts.
- Duplicate requests for the same resource are coalesced.
- Transient transport/server failures use limited exponential backoff.
- Persistent cache is bounded to 80 entries to avoid unbounded TV storage growth.
- TMDB posters/backdrops use smaller derivatives when the browser reports a constrained/save-data connection.
- Images use asynchronous decoding; the hero remains high priority.
- Catalog pages opportunistically prefetch the next page without blocking navigation.
- The application displays a small offline indicator when the browser reports offline.

## Existing UI

The visual components and layout are retained. The network/runtime changes sit underneath the existing React components.

## Build

The repository should use Vite 7.3.6 with the existing React plugin. On the development Mac:

```bash
npm ci
npm run build
node scripts/webos-package.js
cd dist
ares-package --no-minify .
```

The package script stages:

- appinfo.json
- icon.png
- largeIcon.png
- splashBackground.png
- Vite build output

The physical target is LG webOS 6.x / Chromium 79.
