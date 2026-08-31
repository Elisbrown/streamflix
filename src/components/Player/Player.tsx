import { usePlayerBridge } from '../../hooks/usePlayerBridge';
import PlayerControls from './PlayerControls';

interface PlayerProps {
  mediaType: 'movie' | 'tv';
  id: number | string;
  title: string;
  subtitle?: string;
  season?: number;
  episode?: number;
  className?: string;
  showEpisodesButton?: boolean;
  onEpisodesClick?: () => void;
  onBack: () => void;
  onDownload?: () => void;
  getDownloadUrl?: () => string;
}

/**
 * Player
 *
 * Renders the third-party embed iframe (no sandbox, no allowFullScreen so
 * our own fullscreen UI is the only fullscreen experience) and overlays
 * a custom controls layer that talks to the embedded player through
 * postMessage. All clicks on the video surface are captured by the
 * controls layer and forwarded as explicit play/pause/seek commands,
 * which prevents click leakage to ad overlays inside the iframe.
 */
export default function Player({
  mediaType,
  id,
  title,
  subtitle,
  season = 1,
  episode = 1,
  className = '',
  showEpisodesButton,
  onEpisodesClick,
  onBack,
  onDownload,
  getDownloadUrl,
}: PlayerProps) {
  const { embedUrl, iframeRef, state, sources, send } = usePlayerBridge({
    mediaType,
    id,
    season,
    episode,
  });

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <iframe
        key={embedUrl}
        ref={iframeRef}
        data-player="streamflix"
        src={embedUrl}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="no-referrer"
        loading="eager"
        importance="high"
      />
      <PlayerControls
        title={title}
        subtitle={subtitle}
        state={state}
        sources={sources}
        showEpisodesButton={showEpisodesButton}
        onEpisodesClick={onEpisodesClick}
        onBack={onBack}
        send={send}
        onDownload={onDownload}
        getDownloadUrl={getDownloadUrl}
      />
    </div>
  );
}
