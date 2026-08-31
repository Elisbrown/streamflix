import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createMediaObservationLayer,
  streamRegistry,
  type MediaSource,
  type PlaybackState,
  type PlayerCommand,
} from '../services/streamRegistry';
import { getEmbedUrl, getProxyStreamUrl } from '../services/streamingProvider';

export interface StreamMetadata {
  embedUrl: string;
  sources: MediaSource[];
  title?: string;
}

interface UsePlayerBridgeParams {
  mediaType: 'movie' | 'tv';
  id: number | string;
  season?: number;
  episode?: number;
}

interface UsePlayerBridgeResult {
  embedUrl: string;
  proxyUrl: string;
  metadata: StreamMetadata | null;
  metadataError: string | null;
  loadingMetadata: boolean;
  state: PlaybackState;
  sources: MediaSource[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  send: (command: PlayerCommand) => void;
}

/**
 * usePlayerBridge
 *
 * Connects the player iframe to the StreamRegistry. Fetches the proxy
 * metadata on mount, attaches the MediaObservationLayer to the iframe
 * once it mounts, and exposes a `send` function to dispatch commands.
 */
export function usePlayerBridge({
  mediaType,
  id,
  season = 1,
  episode = 1,
}: UsePlayerBridgeParams): UsePlayerBridgeResult {
  const embedUrl = getEmbedUrl(mediaType, id, season, episode);
  const proxyUrl = getProxyStreamUrl(mediaType, id, season, episode);

  const [metadata, setMetadata] = useState<StreamMetadata | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [state, setState] = useState<PlaybackState>(streamRegistry.getState());
  const [sources, setSources] = useState<MediaSource[]>(streamRegistry.getSources());

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const layerRef = useRef<ReturnType<typeof createMediaObservationLayer> | null>(null);

  useEffect(() => {
    streamRegistry.reset();
    setState(streamRegistry.getState());

    const offState = streamRegistry.on('state', (s) => setState(s));
    const offSources = streamRegistry.on('sources', (s) => setSources(s));
    const offError = streamRegistry.on('error', (e) => setMetadataError(e.message));

    const layer = createMediaObservationLayer();
    layerRef.current = layer;
    layer.destroy();

    return () => {
      offState();
      offSources();
      offError();
      layer.destroy();
      layerRef.current = null;
    };
  }, [embedUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoadingMetadata(true);
    setMetadataError(null);

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Proxy ${res.status}`);
        return res.json();
      })
      .then((data: StreamMetadata) => {
        if (cancelled) return;
        setMetadata(data);
        if (data.sources && data.sources.length > 0) {
          streamRegistry.setSources(data.sources);
        }
        if (data.title) {
          streamRegistry.setTitle(data.title);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setMetadataError(err?.message || 'Metadata fetch failed');
        streamRegistry.reportError(err?.message || 'Metadata fetch failed');
      })
      .finally(() => {
        if (!cancelled) setLoadingMetadata(false);
      });

    return () => {
      cancelled = true;
    };
  }, [proxyUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const layer = createMediaObservationLayer();
    layerRef.current = layer;
    const detach = layer.attach(iframe);

    return () => {
      detach();
      layer.destroy();
    };
  }, [embedUrl]);

  const send = useCallback((command: PlayerCommand) => {
    layerRef.current?.send(command);
  }, []);

  return {
    embedUrl,
    proxyUrl,
    metadata,
    metadataError,
    loadingMetadata,
    state,
    sources,
    iframeRef,
    send,
  };
}
