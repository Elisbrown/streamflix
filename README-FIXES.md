# Streamflix fixes: player, deep links, installability, and low-network TV behavior

## Player
- Uses the MoviesAPI documented `postMessage` control channel for parent-controlled play/pause.
- Sandboxes the cross-origin player without `allow-popups` or top-navigation permissions to contain popup/new-tab navigation.
- Provides a parent-level Pause/Play control so the viewer does not have to press the provider's embedded control that was triggering a new tab.
- Adds an alternate TV episode URL format (`/tv/{id}-{season}-{episode}`) as a fallback for series playback failures.

## Deep-link refreshes
`vercel.json` rewrites SPA routes to `/index.html`, so refreshing `/watch/...` or `/search?...` is handled by React Router instead of returning Vercel's 404.

## Installability
The site now ships a web app manifest, a service worker for the app shell, suitable 192/512 icons, and an in-app Install button using the browser's `beforeinstallprompt` event when supported.

## Low-network / poor connectivity
The existing client cache remains responsible for catalog/data persistence. The added service worker makes the site shell recoverable on subsequent visits and the player/detail paths avoid unnecessary blocking work. API requests continue to use the bounded cache/retry layer already in the branch.

## UI preservation
No redesign was introduced. The changes are intended to preserve the existing Streamflix UI while adding TV-safe controls and runtime resilience.

### Player ad containment
The iframe sandbox blocks popups and top-level navigation. It cannot guarantee removal of advertising that is rendered inside the provider's own frame; the app therefore also provides parent-level Play/Pause controls via the provider's documented postMessage API.
