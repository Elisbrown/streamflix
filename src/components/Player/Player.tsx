interface PlayerProps {
  src: string;
  title: string;
  className?: string;
}

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
    </div>
  );
}


