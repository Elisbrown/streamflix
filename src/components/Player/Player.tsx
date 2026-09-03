interface PlayerProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Simple embed player.
 *
 * No `sandbox` attribute is used — the provider refuses to load inside a
 * sandboxed frame. The `csp` attribute was removed after testing showed it
 * prevented the provider player from initializing fully (most movies and
 * series stayed dark / would not load). Popup / redirect blocking is
 * handled by the overlay layer only.
 */
export default function Player({ src, title, className = '' }: PlayerProps) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <iframe
        key={src}
        id="streamflix-player-iframe"
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
      {/* Click-shield: blocks clicks on the video surface so the ad
          overlay inside the embed cannot trigger a popup/redirect. */}
      <div
        className="absolute inset-0 z-10"
        style={{ background: 'transparent' }}
        aria-hidden="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
  );
}
