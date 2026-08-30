import { getMoviesApiUrl } from './api.config';

export interface PlaybackCandidate {
  label: string;
  url: string;
}

export function getPlaybackCandidates(
  mediaType: 'movie' | 'tv',
  id: number | string,
  season = 1,
  episode = 1,
): PlaybackCandidate[] {
  const theme = 'theme=E50914';
  if (mediaType === 'tv') {
    return [
      { label: 'Primary', url: `${getMoviesApiUrl('tv', id, season, episode)}` },
      { label: 'Alternate', url: `https://moviesapi.to/tv/${id}-${season}-${episode}?${theme}` },
    ];
  }
  return [{ label: 'Primary', url: `${getMoviesApiUrl('movie', id, season, episode)}` }];
}
