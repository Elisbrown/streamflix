export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
export const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const ENDPOINTS = {
  trending: '/trending/all/week',
  netflixOriginals: '/discover/tv?with_networks=213',
  topRated: '/movie/top_rated',
  actionMovies: '/discover/movie?with_genres=28',
  comedyMovies: '/discover/movie?with_genres=35',
  horrorMovies: '/discover/movie?with_genres=27',
  romanceMovies: '/discover/movie?with_genres=10749',
  documentaries: '/discover/movie?with_genres=99',
};

export const IMAGE_SIZES = {
  poster: '/w500',
  backdrop: '/original',
};

export interface TvSeason {
  id: number;
  season_number: number;
  episode_count: number;
  name: string;
  overview?: string;
  poster_path?: string;
}

export interface TvEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path?: string;
  runtime?: number;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character?: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
}

export interface Movie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TvSeason[];
  runtime?: number;
  tagline?: string;
  genres?: Genre[];
  credits?: {
    cast?: CastMember[];
    crew?: CrewMember[];
  };
  similar?: {
    results?: Movie[];
  };
}


