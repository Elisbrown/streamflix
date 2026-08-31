interface PlayerProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Simple embed player.
 *
 * Renders the streaming provider's iframe directly without a `sandbox`
 * attribute (the provider refuses to load inside a sandboxed frame).
 * Popups and top-navigations triggered by the ad overlays inside the
 * embed are instead blocked via the iframe's `csp` attribute, which
 * applies a sandbox via Content Security Policy. That sandbox does NOT
 * create a `sandbox` DOM attribute, so the provider's
 * `hasAttribute('sandbox')` check passes, while the browser still
 * blocks `window.open` and `top.location` navigations.
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
        // Block popups / top-navigations from the ad layer without using
        // the `sandbox` attribute (which the provider explicitly rejects).
        // `csp` is supported since Chrome 76 (webOS 6 is Chromium 79).
        csp="sandbox allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-orientation-lock allow-downloads"
      />
    </div>
  );
}
