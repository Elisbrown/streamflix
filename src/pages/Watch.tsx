import axios from 'axios';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ForwardIcon,
  TvIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/solid';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Player from '../components/Player/Player';
import { BASE_URL, Movie, TMDB_API_KEY } from '../services/api.config';
import { getDownloadUrl as getProviderDownloadUrl, getEmbedUrl } from '../services/streamingProvider';
import { markStarted, getProgress, setProgress } from '../services/continueWatchingService';

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
  const [isPlaying, setIsPlaying] = useState(true);
  const [showEpisodesDrawer, setShowEpisodesDrawer] = useState(false);

  useEffect(() => {
    const s = Number(searchParams.get('season'));
    const e = Number(searchParams.get('episode'));
    if (s && !isNaN(s)) setSelectedSeason(s);
    if (e && !isNaN(e) && e !== selectedEpisode) setSelectedEpisode(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  useEffect(() => {
    if (!movie || isTrailerMode) return;
    markStarted(movie, type, selectedSeason, selectedEpisode);
    const TICK_MS = 15_000;
    const DELTA = 0.05;
    const interval = setInterval(() => {
      const current = getProgress(movie.id, type, selectedSeason, selectedEpisode);
      setProgress(movie, type, current + DELTA, selectedSeason, selectedEpisode);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [movie, type, selectedSeason, selectedEpisode, isTrailerMode]);

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

  const embedSrc = isTrailerMode
    ? trailerUrl
    : getEmbedUrl(type, movie.id, selectedSeason, selectedEpisode);

  const togglePlay = useCallback(() => {
    const iframe = document.querySelector('iframe[data-player="streamflix"]') as HTMLIFrameElement | null;
    if (!iframe || !iframe.contentWindow) return;
    const cmd = { cmd: isPlaying ? 'pause' : 'play', type: 'streamflix-command' };
    try {
      iframe.contentWindow.postMessage(cmd, '*');
      iframe.contentWindow.postMessage({ event: isPlaying ? 'pause' : 'play' }, '*');
      iframe.contentWindow.postMessage({ method: isPlaying ? 'pause' : 'play' }, '*');
    } catch {}
    setIsPlaying((prev) => !prev);
  }, [isPlaying]);

  const playerTitle = type === 'tv' ? `${title} S${selectedSeason} E${selectedEpisode}` : title;
  const downloadUrl = !isTrailerMode
    ? getProviderDownloadUrl(type, movie.id, selectedSeason, selectedEpisode)
    : null;

  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen bg-black overflow-hidden select-none">
      {embedSrc ? (
        <Player src={embedSrc} title={playerTitle} className="h-full w-full" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center text-white/50">
          No video stream available for this title.
        </div>
      )}

      {/* Minimal floating chrome: back button + (TV) episodes/download */}
      <div className="pointer-events-none absolute inset-0 z-20">
        <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2">
          <button
            data-focusable
            data-nav-section="watch-controls"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md">
            {type === 'tv' ? `S${selectedSeason} E${selectedEpisode} · ${title}` : title}
          </div>
        </div>

        {type === 'tv' && !isTrailerMode && (
          <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
            <button
              data-focusable
              data-nav-section="watch-controls"
              onClick={() => setShowEpisodesDrawer((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-full bg-black/60 px-3 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <TvIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Episodes</span>
            </button>
          </div>
        )}

        {/* Play / Pause button — uses postMessage to control the provider player */}
        {!isTrailerMode && (
          <button
            data-focusable
            data-nav-section="watch-controls"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-red-700"
          >
            {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6 ml-0.5" />}
          </button>
        )}

        {downloadUrl && (
          <a
            data-focusable
            data-nav-section="watch-controls"
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto absolute bottom-4 right-4 flex h-10 items-center gap-2 rounded-full bg-black/60 px-4 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            Download
          </a>
        )}
      </div>

      {/* TV Episodes Drawer */}
      {type === 'tv' && showEpisodesDrawer && !isTrailerMode && (
        <div className="absolute right-4 top-16 z-30 w-80 max-h-[calc(100vh-100px)] flex flex-col rounded-xl border border-white/15 bg-black/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 font-bold text-white text-sm">
              <TvIcon className="h-4 w-4 text-red-500" />
              <span>Episodes</span>
              <button
                onClick={() => setShowEpisodesDrawer(false)}
                aria-label="Close episodes"
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            {validSeasons.length > 0 && (
              <select
                data-focusable
                data-nav-section="watch-episodes"
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
                data-focusable
                data-nav-section="watch-episodes"
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

      {/* TV Next Episode pill */}
      {type === 'tv' && !isTrailerMode && hasNextEpisode && (
        <button
          data-focusable
          data-nav-section="watch-controls"
          onClick={handleNextEpisode}
          className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white px-5 py-2 text-xs font-black text-black transition hover:bg-white/80 shadow-lg"
        >
          <ChevronRightIcon className="h-3 w-3" />
          <span>Episode {selectedEpisode + 1 > episodeCount ? 1 : selectedEpisode + 1}</span>
          <ForwardIcon className="h-4 w-4" />
          <span>Next</span>
        </button>
      )}
    </div>
  );
};

export default Watch;
