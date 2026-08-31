import { PlayIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getContinueWatching, type ContinueWatchingItem } from '../services/continueWatchingService';
import { getImageUrl } from '../services/movieService';

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setItems(getContinueWatching());
    refresh();
    window.addEventListener('continue_watching_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('continue_watching_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (items.length === 0) return null;

  const handleResume = (item: ContinueWatchingItem) => {
    const season = item.season || 1;
    const episode = item.episode || 1;
    const path =
      item.mediaType === 'tv'
        ? `/watch/tv/${item.id}?season=${season}&episode=${episode}`
        : `/watch/movie/${item.id}`;
    navigate(path);
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between px-4 md:px-[60px]">
        <h2 className="text-xl font-bold text-white md:text-2xl">Continue Watching</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-hide md:px-[60px]">
        {items.map((item) => {
          const title = item.title || item.name || 'Untitled';
          const percent = Math.round(item.progress * 100);
          return (
            <button
              key={`${item.mediaType}-${item.id}-${item.season || 0}-${item.episode || 0}`}
              data-focusable
              data-nav-section="row-continue-watching"
              onClick={() => handleResume(item)}
              className="group relative w-[200px] shrink-0 overflow-hidden rounded-xl bg-[#181818] text-left ring-1 ring-white/10 md:w-[240px]"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={getImageUrl(item.backdrop_path || item.poster_path, 'backdrop')}
                  alt={title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-90 transition group-hover:opacity-100">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl">
                    <PlayIcon className="h-5 w-5 ml-0.5" />
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="line-clamp-1 text-xs font-bold text-white drop-shadow">
                    {item.mediaType === 'tv' ? `S${item.season || 1} E${item.episode || 1} · ${title}` : title}
                  </p>
                </div>
              </div>
              <div className="h-1 w-full bg-white/10">
                <div
                  className="h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
