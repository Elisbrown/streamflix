import { Movie } from './api.config';

const MY_LIST_KEY = 'streamflix_my_list';
const LIKED_KEY = 'streamflix_liked_titles';

export function getMyList(): Movie[] {
  try {
    const data = localStorage.getItem(MY_LIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function isInMyList(movieId: number): boolean {
  const list = getMyList();
  return list.some((item) => item.id === movieId);
}

export function toggleMyList(movie: Movie): boolean {
  const list = getMyList();
  const exists = list.some((item) => item.id === movie.id);
  let updated: Movie[];
  if (exists) {
    updated = list.filter((item) => item.id !== movie.id);
  } else {
    updated = [movie, ...list];
  }
  localStorage.setItem(MY_LIST_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('my_list_updated'));
  return !exists;
}

export function getLikedTitles(): number[] {
  try {
    const data = localStorage.getItem(LIKED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function isLiked(movieId: number): boolean {
  const list = getLikedTitles();
  return list.includes(movieId);
}

export function toggleLike(movieId: number): boolean {
  const list = getLikedTitles();
  const exists = list.includes(movieId);
  let updated: number[];
  if (exists) {
    updated = list.filter((id) => id !== movieId);
  } else {
    updated = [...list, movieId];
  }
  localStorage.setItem(LIKED_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('liked_updated'));
  return !exists;
}
