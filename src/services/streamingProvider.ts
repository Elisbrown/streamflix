/**
 * Streaming provider abstraction.
 *
 * The underlying third-party provider is intentionally not named anywhere in
 * the UI or the rest of the application. All embed and download URLs are
 * constructed here so that swapping providers only requires changes to this
 * file. Nothing outside this module should reference the provider host.
 */

const PROVIDER_BASE_URL = 'https://moviesapi.to';
const THEME_PARAM = 'theme=E50914';

function buildWatchUrl(
  mediaType: 'movie' | 'tv',
  id: number | string,
  season: number,
  episode: number
): string {
  if (mediaType === 'tv') {
    return `${PROVIDER_BASE_URL}/tv/${id}/${season}/${episode}?${THEME_PARAM}`;
  }
  return `${PROVIDER_BASE_URL}/movie/${id}?${THEME_PARAM}`;
}

function buildDownloadUrl(
  mediaType: 'movie' | 'tv',
  id: number | string,
  season: number,
  episode: number
): string {
  if (mediaType === 'tv') {
    return `${PROVIDER_BASE_URL}/tv/${id}/${season}/${episode}/download`;
  }
  return `${PROVIDER_BASE_URL}/movie/${id}/download`;
}

export function getEmbedUrl(
  mediaType: 'movie' | 'tv',
  id: number | string,
  season: number = 1,
  episode: number = 1
): string {
  return buildWatchUrl(mediaType, id, season, episode);
}

export function getDownloadUrl(
  mediaType: 'movie' | 'tv',
  id: number | string,
  season: number = 1,
  episode: number = 1
): string {
  return buildDownloadUrl(mediaType, id, season, episode);
}

export function getStreamHost(): string {
  return PROVIDER_BASE_URL;
}
