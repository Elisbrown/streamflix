interface PlayerProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Simple embed player.
 *
 * Renders the streaming provider's iframe directly. A transparent overlay
 * sits on top of the iframe to block all clicks from reaching it, which
 * prevents the ad-overlay redirects the provider injects. Because the
 * overlay swallows every click, the user cannot interact with the player's
 * own controls; the embed URL is configured for autoplay so playback
 * starts on its own. The Referer header is intentionally NOT suppressed
 * (no `referrerPolicy="no-referrer"`), because the provider's player code
 * flags the embed as "sandboxed" when it cannot see the embedding origin.
 */
export default function Player({ src, title, className = '' }: PlayerProps) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <iframe
        key={src}
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
      {/* Transparent click-blocking layer.
          Sits above the iframe so clicks are captured here instead of
          reaching the ad overlays inside the embed. */}
      <div
        className="absolute inset-0 z-10 cursor-default"
        style={{ background: 'transparent' }}
        aria-hidden="true"
      />
    </div>
  );
}
