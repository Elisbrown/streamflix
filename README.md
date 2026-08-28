# Streamflix — authentication-free TMDB build

This package is an authentication-free adaptation of `deepanik/Netflix`.

## What changed

- Removed the login route and login page.
- Root route opens directly to the browse/home experience.
- Added search routing.
- Added a routed watch screen and responsive iframe player.
- Kept `src/services/movieService.ts` unchanged from the upstream repository.
- Added TMDB detail/video requests in the watch page so the player can show an official TMDB/YouTube trailer without another API key.
- Kept `.env` limited to `VITE_TMDB_API_KEY`.

## Run

```bash
cp .env.example .env
# set VITE_TMDB_API_KEY in .env
npm install
npm run dev
```

The player is intentionally limited to official trailer playback. Replace the `src` supplied to `src/components/Player/Player.tsx` with a licensed playback URL only for content you are authorized to stream.
