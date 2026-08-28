import axios from 'axios';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ForwardIcon,
  ArrowsPointingOutIcon,
  TvIcon,
  ListBulletIcon,
} from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Player from '../components/Player/Player';
import { BASE_URL, Movie, TMDB_API_KEY, getMoviesApiUrl } from '../services/api.config';

interface Video {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

const Watch = () => {
  const { mediaType = 'movie', id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = mediaType === 'tv' ? 'tv' : 'movie';
  const isTrailerMode = searchParams.get('mode') === 'trailer';

  const querySeason = Number(searchParams.get('season')) || 1;
  const queryEpisode = Number(searchParams.get('episode')) || 1;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [trailerUrl, setTrailerUrl] = useState('');
  const [selectedSeason, setSelectedSeason] = useState(querySeason);
  const [selectedEpisode, setSelectedEpisode] = useState(queryEpisode);
  const [error, setError] = useState('');

  // Update season/episode state when URL query params change
  useEffect(() => {
    const s = Number(searchParams.get('season'));
    const e = Number(searchParams.get('episode'));
    if (s && !isNaN(s)) setSelectedSeason(s);
    if (e && !isNaN(e)) setSelectedEpisode(e);
  }, [searchParams]);

  // UI state for full-screen player
  const [showControls, setShowControls] = useState(true);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      setError('Invalid title id.');
      return;
    }

    Promise.all([
      axios.get(`${BASE_URL}/${type}/${numericId}`, { params: { api_key: TMDB_API_KEY } }),
      axios.get(`${BASE_URL}/${type}/${numericId}/videos`, { params: { api_key: TMDB_API_KEY } }),
    ])
      .then(([details, videos]) => {
        setMovie({ ...details.data, media_type: type });
        const trailer = (videos.data.results as Video[] || [])
          .filter((video) => video.site === 'YouTube' && video.type === 'Trailer')
          .sort((a, b) => Number(Boolean(b.official)) - Number(Boolean(a.official)))[0];
        setTrailerUrl(trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0` : '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load this title.'));
  }, [id, type]);

  // Attempt automatic browser fullscreen when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      containerRef.current?.requestFullscreen?.().catch(() => {
        // Silently catch browser policy rejection if un-gestured
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Controls hide/show on mouse inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  if (error) {
    return (
      <main className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141414] p-6 text-white">
        <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-xl font-bold">Unable to load title</h1>
          <p className="mt-3 text-sm text-white/60">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 rounded-md bg-red-600 px-5 py-2.5 font-bold text-white transition hover:bg-red-700"
          >
            Go back
          </button>
        </div>
      </main>
    );
  }

  if (!movie) return <div className="fixed inset-0 z-[100] bg-black" />;

  const title = movie.title || movie.name || 'Untitled';
  const validSeasons = (movie.seasons || []).filter((s) => s.season_number > 0);
  const currentSeasonData = validSeasons.find((s) => s.season_number === selectedSeason) || validSeasons[0];
  const episodeCount = currentSeasonData?.episode_count || movie.number_of_episodes || 24;

  const currentSeasonIndex = validSeasons.findIndex((s) => s.season_number === selectedSeason);
  const hasNextEpisode =
    selectedEpisode < episodeCount ||
    (currentSeasonIndex !== -1 && currentSeasonIndex < validSeasons.length - 1);

  const handleNextEpisode = () => {
    if (selectedEpisode < episodeCount) {
      setSelectedEpisode((prev) => prev + 1);
    } else if (currentSeasonIndex !== -1 && currentSeasonIndex < validSeasons.length - 1) {
      const nextSeasonNumber = validSeasons[currentSeasonIndex + 1].season_number;
      setSelectedSeason(nextSeasonNumber);
      setSelectedEpisode(1);
    }
  };

  const activeStreamUrl = isTrailerMode
    ? trailerUrl
    : getMoviesApiUrl(type, movie.id, selectedSeason, selectedEpisode);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[100] h-screen w-screen bg-black overflow-hidden select-none"
    >
      {/* Fullscreen Video Player */}
      {activeStreamUrl ? (
        <Player
          src={activeStreamUrl}
          title={`${title} ${type === 'tv' ? `S${selectedSeason} E${selectedEpisode}` : ''}`}
          className="h-full w-full"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center text-white/50">
          No video stream available for this title.
        </div>
      )}

      {/* Top Overlay Bar */}
      <div
        className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white md:text-xl drop-shadow">{title}</h1>
            {type === 'tv' && (
              <p className="text-xs font-semibold text-white/70">
                Season {selectedSeason}: Episode {selectedEpisode}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {type === 'tv' && (
            <button
              onClick={() => setShowEpisodesDrawer((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition backdrop-blur-md ${
                showEpisodesDrawer
                  ? 'bg-red-600 text-white'
                  : 'bg-black/60 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
              <span>Episodes</span>
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105"
          >
            <ArrowsPointingOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* TV Episodes Drawer Overlay (If opened) */}
      {type === 'tv' && showEpisodesDrawer && (
        <div
          className={`absolute right-4 top-20 z-40 w-80 max-h-[calc(100vh-140px)] flex flex-col rounded-xl border border-white/15 bg-black/90 p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
            showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <TvIcon className="h-4 w-4 text-red-500" />
              <span>Season & Episodes</span>
            </div>
            {validSeasons.length > 0 && (
              <select
                value={selectedSeason}
                onChange={(e) => {
                  setSelectedSeason(Number(e.target.value));
                  setSelectedEpisode(1);
                }}
                className="rounded border border-white/20 bg-[#222] px-2 py-1 text-xs font-semibold text-white focus:border-red-500 focus:outline-none"
              >
                {validSeasons.map((s) => (
                  <option key={s.id || s.season_number} value={s.season_number}>
                    Season {s.season_number}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
            {Array.from({ length: episodeCount }, (_, i) => i + 1).map((epNum) => (
              <button
                key={epNum}
                onClick={() => {
                  setSelectedEpisode(epNum);
                  setShowEpisodesDrawer(false);
                }}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  selectedEpisode === epNum
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-white/5 text-white/80 hover:bg-white/15 hover:text-white'
                }`}
              >
                <span>Episode {epNum}</span>
                {selectedEpisode === epNum && <span className="text-[10px] font-bold uppercase tracking-wider">Playing</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar for TV Shows */}
      {type === 'tv' && (
        <div
          className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-between p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white/80">Season {selectedSeason}</span>
            <ChevronRightIcon className="h-3 w-3 text-white/40" />
            <span className="text-xs font-bold text-red-500">Episode {selectedEpisode} of {episodeCount}</span>
          </div>

          {hasNextEpisode && (
            <button
              onClick={handleNextEpisode}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-black text-black transition hover:bg-white/80 shadow-lg"
            >
              <ForwardIcon className="h-4 w-4" />
              <span>Next Episode</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Watch;


