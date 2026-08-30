# Changes

## Delete

- `src/pages/Login.tsx`

The router no longer imports or exposes authentication routes.

## Add

- `src/components/Player/Player.tsx`
- `src/pages/Search.tsx`
- `src/pages/Watch.tsx`

## Modify

- `src/App.tsx` — direct home route, no auth route, adds search and watch routes.
- `src/components/Navbar.tsx` — browse-only navigation and search.
- `src/components/MovieRow.tsx` — title cards open the movie details modal.
- `src/components/MovieModal.tsx` — adds a routed watch action.
- `src/pages/Home.tsx` — directly browsable home page with working watch routes.
- `.env.example` — only `VITE_TMDB_API_KEY` remains.

## Unchanged TMDB service layer

`src/services/movieService.ts` remains the upstream TMDB service implementation.

## Playback note

The requested third-party full-movie source is not wired into this package. The player is a responsive iframe component and the watch page supplies an official YouTube trailer discovered through TMDB. This keeps the application functional without providing a mechanism for accessing potentially unauthorized copies of copyrighted films.

## WebOS low-network runtime hardening

- Added persistent API/data caching with stale-while-revalidate behavior.
- Added in-flight request deduplication so repeated screens do not issue duplicate requests.
- Added bounded localStorage cache retention for TV storage constraints.
- Added retry/backoff for transient network errors and short request timeouts.
- Added offline-aware fallback so cached catalog/details remain usable without connectivity.
- Added adaptive TMDB image sizing for constrained connections and asynchronous image decoding.
- Added opportunistic next-page prefetching for catalog rows.
- Added an offline status indicator without changing the existing visual layout.
- Updated webOS staging to include the referenced splash artwork and version 1.0.2.

