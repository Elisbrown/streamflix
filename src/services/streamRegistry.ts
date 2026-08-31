/**
 * StreamRegistry
 *
 * Media observation layer for the player. Tracks the underlying media
 * sources backing the current playback session and notifies observers
 * when sources are discovered, when playback state changes, and when
 * the source type is determined.
 *
 * In the current architecture, the playable video is delivered through a
 * cross-origin third-party iframe. Same-origin policy prevents us from
 * directly inspecting its <video> element or MediaSource, so this registry
 * is populated from:
 *   1. The /api/stream serverless proxy response (which scrapes the embed
 *      page and returns the underlying m3u8/mp4 URLs).
 *   2. postMessage events from the iframe player (timeupdate, playerstatus,
 *      play, pause, ended, seeked).
 *
 * When a future player source is same-origin (or proxied through our own
 * domain), this same registry can additionally hook HTMLMediaElement and
 * MediaSource directly to capture buffered ranges, quality levels, and
 * segment blobs — the same observation model FetchV uses, but without
 * requiring a browser extension.
 */

export type SourceKind = 'mp4' | 'hls' | 'dash' | 'blob' | 'unknown';

export interface MediaSource {
  url: string;
  kind: SourceKind;
  mime?: string;
  quality?: string;
  bandwidth?: number;
  resolution?: string;
}

export interface PlaybackState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  ended: boolean;
  buffering: boolean;
  quality?: string;
}

export interface RegistryEventMap {
  sources: MediaSource[];
  state: PlaybackState;
  title: string;
  error: { message: string; code?: string };
}

type Listener<T> = (value: T) => void;

class StreamRegistry {
  private sources: MediaSource[] = [];
  private state: PlaybackState = {
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    ended: false,
    buffering: false,
  };
  private title = '';

  private listeners: { [K in keyof RegistryEventMap]?: Set<Listener<RegistryEventMap[K]>> } = {};

  setSources(sources: MediaSource[]): void {
    this.sources = sources;
    this.emit('sources', sources);
  }

  getSources(): MediaSource[] {
    return this.sources;
  }

  getPrimarySource(): MediaSource | null {
    if (this.sources.length === 0) return null;
    const hls = this.sources.find((s) => s.kind === 'hls');
    if (hls) return hls;
    const mp4 = this.sources.find((s) => s.kind === 'mp4');
    if (mp4) return mp4;
    return this.sources[0];
  }

  patchState(patch: Partial<PlaybackState>): void {
    this.state = { ...this.state, ...patch };
    this.emit('state', this.state);
  }

  getState(): PlaybackState {
    return this.state;
  }

  setTitle(title: string): void {
    this.title = title;
    this.emit('title', title);
  }

  getTitle(): string {
    return this.title;
  }

  reportError(message: string, code?: string): void {
    this.emit('error', { message, code });
  }

  on<K extends keyof RegistryEventMap>(event: K, listener: Listener<RegistryEventMap[K]>): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event]!.add(listener as Listener<RegistryEventMap[any]>);
    return () => {
      this.listeners[event]?.delete(listener as Listener<RegistryEventMap[any]>);
    };
  }

  reset(): void {
    this.sources = [];
    this.state = {
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      ended: false,
      buffering: false,
    };
    this.title = '';
    this.emit('sources', []);
    this.emit('state', this.state);
    this.emit('title', '');
  }

  private emit<K extends keyof RegistryEventMap>(event: K, value: RegistryEventMap[K]): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        (listener as Listener<RegistryEventMap[K]>)(value);
      } catch (err) {
        console.error('[StreamRegistry] listener error', err);
      }
    });
  }
}

export const streamRegistry = new StreamRegistry();

/**
 * MediaObservationLayer
 *
 * Higher-level helper that wraps a player iframe and feeds the registry.
 * Uses postMessage to receive state from the third-party player and to
 * send commands. This replaces the previous "click through the iframe"
 * control model (which leaked clicks to ad overlays) with an explicit
 * command channel.
 */
export interface MediaObservationLayer {
  attach: (iframe: HTMLIFrameElement) => () => void;
  send: (command: PlayerCommand) => void;
  destroy: () => void;
}

export type PlayerCommand =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'togglePlay' }
  | { type: 'seek'; value: number }
  | { type: 'setVolume'; value: number }
  | { type: 'setMuted'; value: boolean }
  | { type: 'setQuality'; value: string };

const KNOWN_EVENT_KEYS = new Set([
  'play',
  'pause',
  'ended',
  'seeked',
  'timeupdate',
  'playerstatus',
  'durationchange',
  'volumechange',
  'ready',
  'state',
]);

export function createMediaObservationLayer(): MediaObservationLayer {
  let detach: (() => void) | null = null;

  const onMessage = (event: MessageEvent) => {
    if (!event.data) return;
    const data = event.data as Record<string, unknown>;

    // Be tolerant: accept several common postMessage shapes
    const eventName = (data.event || data.type || data.cmd) as string | undefined;
    if (!eventName || typeof eventName !== 'string') return;

    const lower = eventName.toLowerCase();
    if (!KNOWN_EVENT_KEYS.has(lower)) return;

    const time = numberOr(data.time ?? data.currentTime, streamRegistry.getState().currentTime);
    const duration = numberOr(data.duration, streamRegistry.getState().duration);
    const volume = numberOr(data.volume, streamRegistry.getState().volume);
    const muted = boolOr(data.muted, streamRegistry.getState().muted);
    const quality = typeof data.quality === 'string' ? data.quality : streamRegistry.getState().quality;

    if (lower === 'play') {
      streamRegistry.patchState({ playing: true, ended: false });
    } else if (lower === 'pause') {
      streamRegistry.patchState({ playing: false });
    } else if (lower === 'ended') {
      streamRegistry.patchState({ playing: false, ended: true });
    } else if (lower === 'seeked' || lower === 'timeupdate') {
      streamRegistry.patchState({ currentTime: time, duration, buffering: false });
    } else if (lower === 'durationchange') {
      streamRegistry.patchState({ duration });
    } else if (lower === 'volumechange') {
      streamRegistry.patchState({ volume, muted });
    } else if (lower === 'playerstatus' || lower === 'state' || lower === 'ready') {
      streamRegistry.patchState({
        playing: boolOr(data.playing, streamRegistry.getState().playing),
        currentTime: time,
        duration,
        volume,
        muted,
        quality,
        buffering: boolOr(data.buffering, false),
      });
    }
  };

  const send = (command: PlayerCommand) => {
    const iframe = document.querySelector('iframe[data-player="streamflix"]') as HTMLIFrameElement | null;
    if (!iframe || !iframe.contentWindow) return;

    const target = '*';
    const payload =
      command.type === 'seek'
        ? { method: 'seek', value: command.value }
        : command.type === 'setVolume'
        ? { method: 'setVolume', value: command.value }
        : command.type === 'setMuted'
        ? { method: 'setMuted', value: command.value }
        : command.type === 'setQuality'
        ? { method: 'setQuality', value: command.value }
        : { method: command.type };

    try {
      iframe.contentWindow.postMessage({ cmd: payload.method, ...payload, type: 'streamflix-command' }, target);
      // Also try a few alternative shapes the player might accept
      iframe.contentWindow.postMessage(payload, target);
      iframe.contentWindow.postMessage({ event: payload.method, ...payload }, target);
    } catch (err) {
      console.warn('[MediaObservationLayer] postMessage failed', err);
    }

    if (command.type === 'togglePlay') {
      const next = !streamRegistry.getState().playing;
      streamRegistry.patchState({ playing: next });
    } else if (command.type === 'play') {
      streamRegistry.patchState({ playing: true });
    } else if (command.type === 'pause') {
      streamRegistry.patchState({ playing: false });
    } else if (command.type === 'seek') {
      streamRegistry.patchState({ currentTime: command.value });
    } else if (command.type === 'setVolume') {
      streamRegistry.patchState({ volume: clamp01(command.value) });
    } else if (command.type === 'setMuted') {
      streamRegistry.patchState({ muted: command.value });
    } else if (command.type === 'setQuality') {
      streamRegistry.patchState({ quality: command.value });
    }
  };

  return {
    attach: (iframe: HTMLIFrameElement) => {
      window.addEventListener('message', onMessage);
      detach = () => window.removeEventListener('message', onMessage);
      return detach;
    },
    send,
    destroy: () => {
      detach?.();
      detach = null;
    },
  };
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
