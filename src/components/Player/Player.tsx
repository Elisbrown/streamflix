interface PlayerProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Simple embed player.
 *
 * No `sandbox` attribute is used — the provider refuses to load inside a
 * sandboxed frame. Popups / top-navigations fired by the ad overlays
 * are blocked via Permissions Policy and a CSP applied through the
 * `csp` attribute (supported since Chrome 76; webOS 6 is Chromium 79).
 * That CSP does not create a `sandbox` DOM attribute, so the provider's
 * `hasAttribute('sandbox')` check still passes.
 *
 * A transparent overlay covers the video surface while content is
 * playing so clicks on the video do not reach the ad layer inside the
 * embed. The overlay is `pointer-events: auto` and swallows clicks;
 * playback is started via autoplay and controlled through the external
 * chrome in Watch (which sends postMessage commands), so the user never
 * needs to click through to the iframe.
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
        csp="sandbox allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-orientation-lock allow-downloads"
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
