import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { PlayIcon } from '@heroicons/react/24/solid';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Movie } from '../services/api.config';
import { fetchMovies, getImageUrl } from '../services/movieService';

interface MovieRowProps {
  title: string;
  endpoint: 'trending' | 'netflixOriginals' | 'topRated' | 'actionMovies' | 'comedyMovies' | 'horrorMovies' | 'romanceMovies' | 'documentaries';
  onMovieClick?: (movie: Movie) => void;
}

const MovieRow = ({ title, endpoint, onMovieClick }: MovieRowProps) => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // Initial fetch
  useEffect(() => {
    let active = true;
    setMovies([]);
    setPage(1);
    setHasMore(true);

    fetchMovies(endpoint, 1).then((items) => {
      if (active) {
        setMovies(items);
        if (items.length === 0) setHasMore(false);
      }
    });
    return () => {
      active = false;
    };
  }, [endpoint]);

  // Load next page function
  const loadNextPage = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    fetchMovies(endpoint, nextPage)
      .then((newItems) => {
        if (newItems.length === 0) {
          setHasMore(false);
        } else {
          setMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const uniqueNew = newItems.filter((m) => !existingIds.has(m.id));
            return [...prev, ...uniqueNew];
          });
          setPage(nextPage);
        }
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }, [endpoint, hasMore, loadingMore, page]);

  const syncArrows = () => {
    const el = sliderRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 0);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2 || hasMore);

    // Auto-fetch next page when scrolling within 500px of the right end
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 500) {
      loadNextPage();
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = sliderRef.current;
    if (!el) return;

    if (direction === 'right') {
      // If close to the end, trigger next page load
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 800) {
        loadNextPage();
      }
      el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between px-4 md:px-[60px]">
        <h2 className="text-xl font-bold text-white md:text-2xl">{title}</h2>
      </div>
      <div className="relative">
        {showLeft && (
          <button
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
            className="absolute left-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 md:flex"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </button>
        )}
        {showRight && (
          <button
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
            className="absolute right-0 top-0 z-20 hidden h-full w-12 items-center justify-center bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80 md:flex"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </button>
        )}
        <div
          ref={sliderRef}
          onScroll={syncArrows}
          className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide md:px-[60px]"
        >
          {movies.map((movie) => (
            <button
              key={movie.id}
              onClick={() => onMovieClick?.(movie)}
              className="group relative w-[145px] shrink-0 overflow-hidden rounded-xl bg-[#181818] text-left ring-1 ring-white/10 md:w-[180px]"
            >
              <img
                src={getImageUrl(movie.poster_path)}
                alt={movie.title || movie.name || 'Movie'}
                className="aspect-[2/3] w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center gap-2.5 p-3 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <span className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg">
                  <PlayIcon className="h-4 w-4 ml-0.5" />
                </span>
                <span className="line-clamp-2 text-xs font-semibold text-white leading-tight">
                  {movie.title || movie.name}
                </span>
              </div>
            </button>
          ))}
          {loadingMore && (
            <div className="flex w-[145px] shrink-0 items-center justify-center rounded-xl bg-[#181818] md:w-[180px] aspect-[2/3]">
              <div className="h-7 w-7 animate-spin rounded-full border-3 border-red-600 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MovieRow;
