import { BASE_URL, TMDB_API_KEY, ENDPOINTS, IMAGE_BASE_URL, IMAGE_SIZES, Movie } from './api.config';
import { cachedGet, getConnectionProfile, prefetchGet } from './networkCache';

const CACHE_TTL = 24 * 60 * 60 * 1000;
const STALE_TTL = 7 * 24 * 60 * 60 * 1000;

export const getImageUrl = (
  path: string,
  size: keyof typeof IMAGE_SIZES = 'poster',
) => {
  if (!path) return '';

  const connection = getConnectionProfile();
  const requested = IMAGE_SIZES[size];

  // Keep the visual dimensions/design intact while using smaller TMDB
  // derivatives on constrained connections. This reduces decode time and RAM.
  if (size === 'poster' && connection.saveData) {
    return `${IMAGE_BASE_URL}/w342${path}`;
  }

  if (size === 'backdrop' && connection.saveData) {
    return `${IMAGE_BASE_URL}/w780${path}`;
  }

  return `${IMAGE_BASE_URL}${requested}${path}`;
};

function cacheKey(endpoint: keyof typeof ENDPOINTS, page: number) {
  return `movies:${endpoint}:${page}`;
}

export const fetchMovies = async (
  endpoint: keyof typeof ENDPOINTS,
  page: number = 1,
): Promise<Movie[]> => {
  const key = cacheKey(endpoint, page);

  try {
    const data = await cachedGet<{ results?: Movie[]; total_pages?: number }>(
      key,
      `${BASE_URL}${ENDPOINTS[endpoint]}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          page,
        },
      },
      {
        ttlMs: CACHE_TTL,
        staleTtlMs: STALE_TTL,
        timeoutMs: 10000,
        retries: 2,
      },
    );

    const results = Array.isArray(data?.results) ? data.results : [];

    // Opportunistically prepare the next catalog page while the user is
    // browsing the current row. This is deliberately best-effort.
    if (results.length > 0 && data?.total_pages && page < data.total_pages) {
      void prefetchGet(
        cacheKey(endpoint, page + 1),
        `${BASE_URL}${ENDPOINTS[endpoint]}`,
        { params: { api_key: TMDB_API_KEY, page: page + 1 } },
        { ttlMs: CACHE_TTL, staleTtlMs: STALE_TTL, timeoutMs: 8000, retries: 1 },
      );
    }

    return results;
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
};

export const fetchTrending = () => fetchMovies('trending');
export const fetchNetflixOriginals = () => fetchMovies('netflixOriginals');
export const fetchTopRated = () => fetchMovies('topRated');
export const fetchActionMovies = () => fetchMovies('actionMovies');
export const fetchComedyMovies = () => fetchMovies('comedyMovies');
export const fetchHorrorMovies = () => fetchMovies('horrorMovies');
export const fetchRomanceMovies = () => fetchMovies('romanceMovies');
export const fetchDocumentaries = () => fetchMovies('documentaries');
