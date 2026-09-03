import { useEffect, useRef, useState } from 'react';

interface PlayerProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Simple embed player.
 *
 * The overlay starts with pointer-events: none so the user can interact
 * with the provider's native play button. Once the provider sends a
 * postMessage event (`ready` / `play`), the overlay activates and blocks
 * clicks to prevent ad redirects. If no event arrives (e.g. autoplay
 * already working), a timeout activates the shield after 5s so ads are
 * still blocked during playback.
 */
export default function Player({ src, title, className = '' }: PlayerProps) {
  const [overlayActive, setOverlayActive] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = (e.data || {}) as Record<string, unknown>;
      const cmd = d.event || d.cmd || d.method || d.type;
        if (typeof cmd === 'string' && ['ready', 'play', 'playing'].includes(cmd.toLowerCase())) {
          setOverlayActive(true);
        }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOverlayActive(true);
    }, 5000);
    timerRef.current = timer;
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

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
      {/* Click-shield activates once playback starts (postMessage) or after 5s. */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 z-10 transition-opacity duration-300 ${
          overlayActive ? 'pointer-events-auto' : 'pointer-events-none opacity-0'
        }`}
        style={{ background: 'transparent' }}
        aria-hidden="true"
        onClick={(e) => {
          if (overlayActive) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      />
    </div>
  );
}
