import axios from 'axios';
import { BASE_URL, TMDB_API_KEY, ENDPOINTS, IMAGE_BASE_URL, IMAGE_SIZES, Movie } from './api.config';

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export const getImageUrl = (path: string, size: keyof typeof IMAGE_SIZES = 'poster') => {
  return `${IMAGE_BASE_URL}${IMAGE_SIZES[size]}${path}`;
};

export const fetchMovies = async (endpoint: keyof typeof ENDPOINTS, page: number = 1): Promise<Movie[]> => {
  try {
    const response = await api.get(ENDPOINTS[endpoint], { params: { page } });
    return response.data.results || [];
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
