import {
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  LockClosedIcon,
  LockOpenIcon,
  ForwardIcon,
  ListBulletIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/solid';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaSource, PlaybackState, PlayerCommand } from '../services/streamRegistry';

interface PlayerControlsProps {
  title: string;
  subtitle?: string;
  state: PlaybackState;
  sources: MediaSource[];
  showEpisodesButton?: boolean;
  onEpisodesClick?: () => void;
  onBack: () => void;
  send: (command: PlayerCommand) => void;
  onDownload?: () => void;
  getDownloadUrl?: () => string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerControls({
  title,
  subtitle,
  state,
  sources,
  showEpisodesButton,
  onEpisodesClick,
  onBack,
  send,
  onDownload,
  getDownloadUrl,
}: PlayerControlsProps) {
  const [locked, setLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [muted, setMuted] = useState(state.muted);
  const [volume, setVolume] = useState(state.volume);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const armHide = useCallback(() => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!locked) setShowControls(false);
    }, 3500);
  }, [locked]);

  useEffect(() => {
    if (locked) {
      setShowControls(false);
      return;
    }
    armHide();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [armHide, locked, state.currentTime, state.playing]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleActivity = useCallback(() => {
    if (locked) return;
    setShowControls(true);
    armHide();
  }, [armHide, locked]);

  const handleUnlockClick = useCallback(() => {
    setLocked(false);
    setShowControls(true);
    armHide();
  }, [armHide]);

  const togglePlay = useCallback(() => {
    if (locked) return;
    send({ type: 'togglePlay' });
    handleActivity();
  }, [send, handleActivity, locked]);

  const handleSeek = useCallback(
    (value: number) => {
      send({ type: 'seek', value });
    },
    [send]
  );

  const handleSeekChange = useCallback((value: number) => {
    setSeekValue(value);
  }, []);

  const handleSeekCommit = useCallback(
    (value: number) => {
      handleSeek(value);
    },
    [handleSeek]
  );

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    send({ type: 'setMuted', value: next });
  }, [muted, send]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      setVolume(value);
      send({ type: 'setVolume', value });
    },
    [send]
  );

  const progress = state.duration > 0 ? state.currentTime / state.duration : 0;
  const displayedTime = seeking ? seekValue : state.currentTime;

  const hlsSources = sources.filter((s) => s.kind === 'hls');
  const showQuality = hlsSources.length > 1;
  const currentQuality = state.quality || (hlsSources[0]?.quality ?? 'Auto');

  return (
    <div
      ref={containerRef}
      onMouseMove={handleActivity}
      onMouseLeave={() => !locked && setShowControls(false)}
      className="absolute inset-0 z-20 select-none"
      data-player-controls
    >
      {/* Transparent click-capture to forward play/pause to our bridge without
          leaking the click to the iframe (which is what triggered the ad redirects). */}
      <button
        onClick={togglePlay}
        aria-label={state.playing ? 'Pause' : 'Play'}
        className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
        style={{ background: 'transparent' }}
      />

      {/* Center play/pause icon (visible on pause or when controls are showing) */}
      {!state.playing && !locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/20">
            <PlayIcon className="h-10 w-10 ml-1" />
          </span>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-5 md:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls && !locked ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            data-focusable data-nav-section="watch-controls"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-white drop-shadow md:text-lg">{title}</h1>
            {subtitle && <p className="truncate text-xs font-semibold text-white/70">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showEpisodesButton && (
            <button
              data-focusable data-nav-section="watch-controls"
              onClick={onEpisodesClick}
              className="flex h-10 items-center gap-2 rounded-full bg-black/50 px-3 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <ListBulletIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Episodes</span>
            </button>
          )}
          {onDownload && getDownloadUrl && (
            <a
              data-focusable data-nav-section="watch-controls"
              href={getDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDownload}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105"
              aria-label="Download"
              title="Download"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </a>
          )}
          <button
            data-focusable data-nav-section="watch-controls"
            onClick={() => setLocked((v) => !v)}
            aria-label={locked ? 'Unlock controls' : 'Lock controls'}
            className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition hover:scale-105 ${
              locked ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-black/50 text-white hover:bg-white/20'
            }`}
          >
            {locked ? <LockClosedIcon className="h-5 w-5" /> : <LockOpenIcon className="h-5 w-5" />}
          </button>
          <button
            data-focusable data-nav-section="watch-controls"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105"
          >
            {isFullscreen ? <ArrowsPointingInIcon className="h-5 w-5" /> : <ArrowsPointingOutIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Bottom bar: seek + transport */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3 p-5 md:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls && !locked ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-xs font-semibold tabular-nums text-white/90">
            {formatTime(displayedTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(state.duration, 0.001)}
            step={0.1}
            value={seeking ? seekValue : state.currentTime}
            onChange={(e) => {
              handleSeekChange(Number(e.target.value));
            }}
            onPointerDown={() => setSeeking(true)}
            onPointerUp={(e) => {
              setSeeking(false);
              handleSeekCommit(Number((e.target as HTMLInputElement).value));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSeekCommit(Number((e.target as HTMLInputElement).value));
              }
            }}
            aria-label="Seek"
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-red-600"
            style={{
              background: `linear-gradient(to right, rgb(229,9,20) 0%, rgb(229,9,20) ${progress * 100}%, rgba(255,255,255,0.2) ${progress * 100}%, rgba(255,255,255,0.2) 100%)`,
            }}
          />
          <span className="w-12 text-xs font-semibold tabular-nums text-white/70">
            {formatTime(state.duration)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              data-focusable data-nav-section="watch-controls"
              onClick={togglePlay}
              aria-label={state.playing ? 'Pause' : 'Play'}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105"
            >
              {state.playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5 ml-0.5" />}
            </button>
            <button
              data-focusable data-nav-section="watch-controls"
              onClick={() => send({ type: 'seek', value: Math.max(0, state.currentTime + 10) })}
              aria-label="Forward 10 seconds"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20"
            >
              <ForwardIcon className="h-5 w-5" />
            </button>
            <div className="ml-2 flex items-center gap-2">
              <button
                data-focusable data-nav-section="watch-controls"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-white/20"
              >
                {muted || volume === 0 ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  handleVolumeChange(v);
                  if (v > 0 && muted) setMuted(false);
                }}
                aria-label="Volume"
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
            </div>
          </div>

          {showQuality && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Quality</span>
              <div className="flex items-center gap-1 rounded-full bg-black/50 p-1 backdrop-blur-md">
                <button
                  className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                >
                  {currentQuality}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Locked indicator */}
      {locked && (
        <button
          onClick={handleUnlockClick}
          aria-label="Unlock controls"
          className="absolute right-6 top-1/2 z-40 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 text-white shadow-2xl backdrop-blur-md transition hover:bg-red-700 hover:scale-110"
          title="Tap to unlock controls"
        >
          <LockClosedIcon className="h-6 w-6" />
        </button>
      )}

      {/* Buffering indicator */}
      {state.buffering && !locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-red-600" />
        </div>
      )}
    </div>
  );
}
