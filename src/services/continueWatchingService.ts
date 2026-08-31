import { Movie } from './api.config';

const CONTINUE_WATCHING_KEY = 'streamflix_continue_watching';

export interface ContinueWatchingItem extends Movie {
  progress: number;
  lastWatchedAt: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

const WATCHED_THRESHOLD = 0.8;

function readAll(): ContinueWatchingItem[] {
  try {
    const data = localStorage.getItem(CONTINUE_WATCHING_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ContinueWatchingItem[]): void {
  try {
    localStorage.setItem(CONTINUE_WATCHING_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('continue_watching_updated'));
  } catch {}
}

export function getContinueWatching(): ContinueWatchingItem[] {
  return readAll()
    .filter((item) => item.progress > 0 && item.progress < WATCHED_THRESHOLD)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export function getWatchedTitles(): ContinueWatchingItem[] {
  return readAll()
    .filter((item) => item.progress >= WATCHED_THRESHOLD)
    .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
}

export function isWatched(movieId: number): boolean {
  return readAll().some((item) => item.id === movieId && item.progress >= WATCHED_THRESHOLD);
}

export function getProgress(
  movieId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): number {
  const all = readAll();
  const key = buildKey(movieId, mediaType, season, episode);
  const match = all.find((item) => buildKey(item.id, item.mediaType, item.season, item.episode) === key);
  return match ? match.progress : 0;
}

export function setProgress(
  movie: Movie,
  mediaType: 'movie' | 'tv',
  progress: number,
  season?: number,
  episode?: number
): void {
  const all = readAll();
  const key = buildKey(movie.id, mediaType, season, episode);
  const existing = all.find(
    (item) => buildKey(item.id, item.mediaType, item.season, item.episode) === key
  );
  const clamped = Math.max(0, Math.min(1, progress));
  const finalProgress = existing ? Math.max(existing.progress, clamped) : clamped;
  const filtered = all.filter(
    (item) => buildKey(item.id, item.mediaType, item.season, item.episode) !== key
  );
  filtered.unshift({
    ...movie,
    progress: finalProgress,
    lastWatchedAt: Date.now(),
    mediaType,
    season,
    episode,
  });
  writeAll(filtered);
}

export function markStarted(
  movie: Movie,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): void {
  const existing = getProgress(movie.id, mediaType, season, episode);
  if (existing === 0) {
    setProgress(movie, mediaType, 0.05, season, episode);
  }
}

export function removeFromContinueWatching(
  movieId: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): void {
  const all = readAll();
  const key = buildKey(movieId, mediaType, season, episode);
  const filtered = all.filter(
    (item) => buildKey(item.id, item.mediaType, item.season, item.episode) !== key
  );
  writeAll(filtered);
}

function buildKey(
  id: number,
  mediaType: 'movie' | 'tv',
  season?: number,
  episode?: number
): string {
  return mediaType === 'tv' ? `tv-${id}-${season || 1}-${episode || 1}` : `movie-${id}`;
}
