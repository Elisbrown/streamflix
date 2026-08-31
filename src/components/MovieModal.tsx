import axios from 'axios';
import { XMarkIcon, PlayIcon, TvIcon, FilmIcon, PlusIcon, CheckIcon, HandThumbUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpatialNav } from '../hooks/useSpatialNav';
import { BASE_URL, Movie, TMDB_API_KEY, TvEpisode, TvSeason } from '../services/api.config';
import { getDownloadUrl } from '../services/streamingProvider';
import { getImageUrl } from '../services/movieService';
import { isInMyList, isLiked, toggleLike, toggleMyList } from '../services/myListService';

interface MovieModalProps {
  movie: Movie;
  onClose: () => void;
}

function formatRuntime(minutes?: number): string {
  if (!minutes) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

const MovieModal = ({ movie, onClose }: MovieModalProps) => {
  const { setCloseOverlay } = useSpatialNav();
  useEffect(() => {
    setCloseOverlay(() => onClose);
    return () => setCloseOverlay(() => {});
  }, [setCloseOverlay, onClose]);

  const [activeMovie, setActiveMovie] = useState<Movie>(movie);

  useEffect(() => {
    setActiveMovie(movie);
  }, [movie]);

  const type = activeMovie.media_type === 'tv' || activeMovie.name ? 'tv' : 'movie';
  const title = activeMovie.title || activeMovie.name || 'Untitled';
  const year = activeMovie.release_date || activeMovie.first_air_date;

  const [details, setDetails] = useState<Movie | null>(null);
  const [seasons, setSeasons] = useState<TvSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<TvEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);

  // Persistent List & Like state
  const [inList, setInList] = useState(() => isInMyList(activeMovie.id));
  const [liked, setLiked] = useState(() => isLiked(activeMovie.id));

  useEffect(() => {
    setInList(isInMyList(activeMovie.id));
    setLiked(isLiked(activeMovie.id));
  }, [activeMovie.id]);

  const handleToggleList = () => {
    const nextState = toggleMyList(activeMovie);
    setInList(nextState);
  };

  const handleToggleLike = () => {
    const nextState = toggleLike(activeMovie.id);
    setLiked(nextState);
  };

  // Fetch full details (genres, runtime, cast, crew, similar)
  useEffect(() => {
    let active = true;

    axios
      .get(`${BASE_URL}/${type}/${activeMovie.id}`, {
        params: {
          api_key: TMDB_API_KEY,
          append_to_response: 'credits,similar,recommendations',
        },
      })
      .then((res) => {
        if (!active) return;
        setDetails(res.data);

        if (type === 'tv') {
          const validSeasons = (res.data.seasons as TvSeason[] || []).filter((s) => s.season_number > 0);
          setSeasons(validSeasons);
          if (validSeasons.length > 0) {
            setSelectedSeason(validSeasons[0].season_number);
          }
        }

        const sim = res.data.similar?.results || res.data.recommendations?.results || [];
        setSimilarMovies(sim.slice(0, 6));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [activeMovie.id, type]);

  // Fetch episodes when selectedSeason changes
  useEffect(() => {
    if (type !== 'tv' || !selectedSeason) return;

    setLoadingEpisodes(true);
    axios
      .get(`${BASE_URL}/tv/${activeMovie.id}/season/${selectedSeason}`, {
        params: { api_key: TMDB_API_KEY },
      })
      .then((res) => {
        setEpisodes(res.data.episodes || []);
        setLoadingEpisodes(false);
      })
      .catch(() => {
        setLoadingEpisodes(false);
      });
  }, [activeMovie.id, selectedSeason, type]);

  const castNames = details?.credits?.cast?.slice(0, 5).map((c) => c.name).join(', ');
  const directorName = details?.credits?.crew?.find((c) => c.job === 'Director')?.name;
  const genresList = details?.genres?.map((g) => g.name).join(', ');
  const runtimeFormatted = formatRuntime(details?.runtime);

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto my-8 max-w-4xl overflow-hidden rounded-2xl bg-[#181818] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Section */}
        <div className="relative h-72 md:h-[420px] w-full overflow-hidden">
          <img
            src={getImageUrl(activeMovie.backdrop_path, 'backdrop')}
            alt={title}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/20 to-transparent" />
          <button
            data-focusable data-nav-section="modal"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-black/70 p-2 text-white hover:bg-black transition"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 left-6 right-6 md:left-10">
            <h2 className="text-2xl font-black text-white md:text-4xl">{title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
              <span className="font-bold text-emerald-400">
                {Math.round(activeMovie.vote_average * 10)}% Match
              </span>
              <span>{year?.slice(0, 4) || '—'}</span>
              {type === 'movie' && runtimeFormatted && (
                <span>{runtimeFormatted}</span>
              )}
              {type === 'tv' && seasons.length > 0 && (
                <span>{seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}</span>
              )}
              <span className="rounded-full border border-white/30 px-2.5 py-0.5 text-xs text-white/80 font-semibold">
                HD
              </span>
              <span className="rounded-full border border-white/30 px-2.5 py-0.5 text-xs text-white/80 font-semibold uppercase">
                {type}
              </span>
            </div>
          </div>
        </div>

        {/* Info, Action Buttons & Metadata */}
        <div className="flex flex-col gap-6 p-6 md:p-10">
          {/* Description */}
          <div>
            {details?.tagline && (
              <p className="mb-2 text-sm font-semibold italic text-white/60">
                "{details.tagline}"
              </p>
            )}
            <p className="leading-relaxed text-white/90 text-base md:text-lg">
              {details?.overview || activeMovie.overview || 'No description available.'}
            </p>
          </div>

          {/* Action Buttons in a single horizontal row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              data-focusable data-nav-section="modal-actions"
              to={
                type === 'tv'
                  ? `/watch/tv/${activeMovie.id}?season=${selectedSeason}&episode=1`
                  : `/watch/movie/${activeMovie.id}`
              }
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 font-bold text-white transition hover:bg-red-700 shadow-xl"
            >
              <PlayIcon className="h-5 w-5" />
              Play {type === 'tv' ? 'Show' : 'Movie'}
            </Link>
            <Link
              data-focusable data-nav-section="modal-actions"
              to={`/watch/${type}/${activeMovie.id}?mode=trailer`}
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3.5 font-bold text-white transition hover:bg-white/20"
            >
              Watch Trailer
            </Link>
            <button
              data-focusable data-nav-section="modal-actions"
              onClick={handleToggleList}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 font-bold text-white transition ${
                inList ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              {inList ? <CheckIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
              {inList ? 'In My List' : 'Add to List'}
            </button>
            <button
              data-focusable data-nav-section="modal-actions"
              onClick={handleToggleLike}
              className={`inline-flex items-center justify-center rounded-full p-3.5 font-bold transition ${
                liked ? 'bg-red-600 text-white' : 'bg-white/15 text-white/80 hover:bg-white/25'
              }`}
              title={liked ? 'Liked' : 'Like'}
            >
              <HandThumbUpIcon className="h-5 w-5" />
            </button>
            <a
              data-focusable data-nav-section="modal-actions"
              href={getDownloadUrl(type, activeMovie.id, selectedSeason, type === 'tv' ? 1 : 1)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-6 py-3.5 font-bold text-white transition hover:bg-white/20"
              title="Download from MoviesAPI"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download
            </a>
          </div>

          {/* Metadata Rows: Cast, Genres, Director */}
          {(castNames || genresList || directorName) && (
            <div className="flex flex-col gap-2 pt-4 text-sm border-t border-white/10">
              {castNames && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-white/40 font-medium">Cast:</span>
                  <span className="text-white/90 font-medium">{castNames}</span>
                </div>
              )}
              {genresList && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-white/40 font-medium">Genres:</span>
                  <span className="text-white/90 font-medium">{genresList}</span>
                </div>
              )}
              {directorName && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-white/40 font-medium">Director:</span>
                  <span className="text-white/90 font-medium">{directorName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TV Series Episodes Section */}
        {type === 'tv' && (
          <div className="border-t border-white/10 p-6 md:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <TvIcon className="h-6 w-6 text-red-500" />
                <h3 className="text-xl font-bold text-white">Episodes</h3>
              </div>

              {seasons.length > 0 && (
                <select
                  data-focusable data-nav-section="modal-episodes"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="rounded-full border border-white/20 bg-[#222] px-4 py-2 text-sm font-bold text-white focus:border-red-500 focus:outline-none cursor-pointer"
                >
                  {seasons.map((s) => (
                    <option key={s.id || s.season_number} value={s.season_number}>
                      {s.name || `Season ${s.season_number}`} ({s.episode_count} Episodes)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {loadingEpisodes ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
              </div>
            ) : episodes.length > 0 ? (
              <div className="flex flex-col gap-4 max-h-[480px] overflow-y-auto pr-2 scrollbar-thin">
                {episodes.map((ep) => (
                  <Link
                    data-focusable data-nav-section="modal-episodes"
                    key={ep.id || ep.episode_number}
                    to={`/watch/tv/${activeMovie.id}?season=${selectedSeason}&episode=${ep.episode_number}`}
                    onClick={onClose}
                    className="group flex flex-col gap-4 rounded-xl bg-white/5 p-4 transition hover:bg-white/10 md:flex-row md:items-center"
                  >
                    <span className="text-xl font-bold text-white/50 w-8 text-center shrink-0">
                      {ep.episode_number}
                    </span>
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-[#222] md:w-40">
                      {ep.still_path ? (
                        <img
                          src={getImageUrl(ep.still_path)}
                          alt={ep.name}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                          No Thumbnail
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                          <PlayIcon className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-white text-base truncate group-hover:text-red-500 transition">
                          {ep.name}
                        </h4>
                        {ep.runtime ? (
                          <span className="text-xs text-white/50 shrink-0 font-medium">{ep.runtime}m</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-white/70 line-clamp-2">
                        {ep.overview || 'No episode summary available.'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm text-white/50 text-center">No episodes found for this season.</p>
            )}
          </div>
        )}

        {/* More Like This Section */}
        {similarMovies.length > 0 && (
          <div className="border-t border-white/10 p-6 md:p-10">
            <div className="flex items-center gap-2 mb-6">
              <FilmIcon className="h-6 w-6 text-red-500" />
              <h3 className="text-xl font-bold text-white">More Like This</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              {similarMovies.map((sim) => (
                <button
                  data-focusable data-nav-section="modal-similar"
                  key={sim.id}
                  onClick={() => setActiveMovie(sim)}
                  className="group relative overflow-hidden rounded-xl bg-[#222] text-left transition hover:scale-105"
                >
                  <img
                    src={getImageUrl(sim.poster_path)}
                    alt={sim.title || sim.name || ''}
                    className="aspect-[2/3] w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="line-clamp-1 text-xs font-bold text-white group-hover:text-red-500 transition">
                      {sim.title || sim.name}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                      {Math.round(sim.vote_average * 10)}% Match
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieModal;

