import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';

export interface PlayerHandle {
  send: (message: { action: string; time?: number; volume?: number; rate?: number }) => void;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  getStatus: () => void;
}

interface PlayerProps {
  src: string;
  title: string;
  className?: string;
  onPlayerEvent?: (event: { event: string; currentTime?: number; duration?: number; paused?: boolean; percentage?: number }) => void;
}

const PLAYER_ORIGIN = 'https://moviesapi.to';

const Player = forwardRef<PlayerHandle, PlayerProps>(function Player({ src, title, className = '', onPlayerEvent }, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const send = (message: { action: string; time?: number; volume?: number; rate?: number }) => {
    iframeRef.current?.contentWindow?.postMessage(message, '*');
  };

  useImperativeHandle(ref, () => ({
    send,
    togglePlay: () => send({ action: 'togglePlay' }),
    pause: () => send({ action: 'pause' }),
    play: () => send({ action: 'play' }),
    getStatus: () => send({ action: 'getStatus' }),
  }), []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'moviesapi-player') return;
      onPlayerEvent?.(data);
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onPlayerEvent]);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <iframe
        ref={iframeRef}
        key={src}
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        /*
         * The sandbox intentionally omits allow-popups and allow-top-navigation.
         * This keeps player-originated popup/top-level navigation inside the
         * iframe instead of throwing the viewer into an advertising tab/window.
         * Scripts and same-origin behavior are retained because the embed player
         * requires them.
         */
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
});

export default Player;
