import {
  InformationCircleIcon,
  PlayIcon,
  PlusIcon,
  CheckIcon,
  HandThumbUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import { fetchTrending, getImageUrl } from '../services/movieService';
import { Movie } from '../services/api.config';
import { isInMyList, isLiked, toggleLike, toggleMyList } from '../services/myListService';

export default function Home() {
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const heroMovie = heroMovies[currentHeroIndex] || null;

  const [heroInList, setHeroInList] = useState(false);
  const [heroLiked, setHeroLiked] = useState(false);

  // Fetch top 10 trending items for carousel
  useEffect(() => {
    fetchTrending().then((items) => {
      const topItems = items.filter((item) => item.backdrop_path).slice(0, 10);
      setHeroMovies(topItems.length > 0 ? topItems : items.slice(0, 10));
    });
  }, []);

  // Update List & Like states when current slide changes
  useEffect(() => {
    if (heroMovie) {
      setHeroInList(isInMyList(heroMovie.id));
      setHeroLiked(isLiked(heroMovie.id));
    }
  }, [heroMovie]);

  // 10-second auto-slide interval with fade transition
  useEffect(() => {
    if (heroMovies.length <= 1) return;

    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
        setFade(true);
      }, 500);
    }, 10000);

    return () => clearInterval(timer);
  }, [heroMovies]);

  const changeSlide = (newIndex: number) => {
    setFade(false);
    setTimeout(() => {
      setCurrentHeroIndex(newIndex);
      setFade(true);
    }, 300);
  };

  const handleNextSlide = () => {
    if (heroMovies.length === 0) return;
    const next = (currentHeroIndex + 1) % heroMovies.length;
    changeSlide(next);
  };

  const handlePrevSlide = () => {
    if (heroMovies.length === 0) return;
    const prev = (currentHeroIndex - 1 + heroMovies.length) % heroMovies.length;
    changeSlide(prev);
  };

  const handleHeroToggleList = () => {
    if (!heroMovie) return;
    const nextState = toggleMyList(heroMovie);
    setHeroInList(nextState);
  };

  const handleHeroToggleLike = () => {
    if (!heroMovie) return;
    const nextState = toggleLike(heroMovie.id);
    setHeroLiked(nextState);
  };

  const rows = [
    ['Trending Now', 'trending' as const],
    ['Netflix Originals', 'netflixOriginals' as const],
    ['Top Rated', 'topRated' as const],
    ['Action', 'actionMovies' as const],
    ['Comedy', 'comedyMovies' as const],
    ['Horror', 'horrorMovies' as const],
    ['Romance', 'romanceMovies' as const],
    ['Documentaries', 'documentaries' as const],
  ];

  return (
    <main className="min-h-screen bg-[#141414] pb-12 pt-14 text-white">
      {heroMovie && (
        <section className="relative -mt-14 min-h-[75vh] overflow-hidden group">
          {/* Backdrop Image with Smooth Fade */}
          <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${fade ? 'opacity-100' : 'opacity-20'}`}>
            <img
              src={getImageUrl(heroMovie.backdrop_path, 'backdrop')}
              alt={heroMovie.title || heroMovie.name || ''}
              className="h-full w-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
          </div>

          {/* Side Nav Arrows */}
          <button
            onClick={handlePrevSlide}
            aria-label="Previous Featured Movie"
            className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-md transition hover:bg-black/80 group-hover:flex"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            onClick={handleNextSlide}
            aria-label="Next Featured Movie"
            className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-md transition hover:bg-black/80 group-hover:flex"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>

          {/* Hero Movie Content */}
          <div className="relative flex min-h-[75vh] items-end px-6 pb-20 pt-32 md:px-10">
            <div className={`max-w-2xl transition-all duration-700 ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                  Featured #{currentHeroIndex + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[.2em] text-white/60">
                  {heroMovie.release_date?.slice(0, 4) || heroMovie.first_air_date?.slice(0, 4) || 'Trending'}
                </span>
              </div>
              <h1 className="text-4xl font-black text-white md:text-6xl drop-shadow-lg">
                {heroMovie.title || heroMovie.name}
              </h1>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/80 md:text-base drop-shadow">
                {heroMovie.overview}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to={`/watch/${heroMovie.name && !heroMovie.title ? 'tv' : 'movie'}/${heroMovie.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-black shadow-xl transition hover:bg-white/80"
                >
                  <PlayIcon className="h-5 w-5" /> Play
                </Link>
                <button
                  onClick={() => setSelectedMovie(heroMovie)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3.5 font-bold backdrop-blur transition hover:bg-white/30"
                >
                  <InformationCircleIcon className="h-5 w-5" /> More Info
                </button>
                <button
                  onClick={handleHeroToggleList}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-bold backdrop-blur transition ${
                    heroInList ? 'bg-emerald-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {heroInList ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                  {heroInList ? 'In My List' : 'My List'}
                </button>
                <button
                  onClick={handleHeroToggleLike}
                  className={`inline-flex items-center rounded-full p-3.5 font-bold backdrop-blur transition ${
                    heroLiked ? 'bg-red-600 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title={heroLiked ? 'Liked' : 'Like'}
                >
                  <HandThumbUpIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Progress Indicators */}
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
            {heroMovies.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => changeSlide(idx)}
                aria-label={`Jump to slide ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  currentHeroIndex === idx
                    ? 'w-8 bg-red-600 shadow-md'
                    : 'w-2.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </section>
      )}

      <div className="relative z-10 -mt-5">
        {rows.map(([rowTitle, endpoint]) => (
          <MovieRow key={endpoint} title={rowTitle} endpoint={endpoint} onMovieClick={setSelectedMovie} />
        ))}
      </div>

      {selectedMovie ? <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} /> : null}

      <div className="mx-auto mt-10 max-w-[1800px] px-6 text-xs text-white/40 md:px-10">
        This product uses TMDB and the TMDB APIs but is not endorsed, certified or otherwise approved by TMDB.
      </div>
    </main>
  );
}
