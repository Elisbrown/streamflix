import { useEffect, useState } from 'react';
import MovieModal from '../components/MovieModal';
import { Movie, IMAGE_BASE_URL } from '../services/api.config';
import { getMyList } from '../services/myListService';
import { TrashIcon } from '@heroicons/react/24/solid';

const MyList = () => {
  const [list, setList] = useState<Movie[]>(() => getMyList());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setList(getMyList());
    };
    window.addEventListener('my_list_updated', handleUpdate);
    return () => window.removeEventListener('my_list_updated', handleUpdate);
  }, []);

  return (
    <main className="min-h-screen bg-[#141414] px-4 pb-16 pt-24 text-white md:px-10">
      <h1 className="mb-8 text-4xl font-bold">My List</h1>
      {list.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
          {list.map((movie) => (
            <div key={movie.id} className="group relative overflow-hidden rounded-xl bg-[#181818] text-left ring-1 ring-white/10">
              <button onClick={() => setSelectedMovie(movie)} className="w-full">
                <img
                  src={`${IMAGE_BASE_URL}/w500${movie.poster_path}`}
                  alt={movie.title || movie.name || ''}
                  className="aspect-[2/3] w-full object-cover transition group-hover:scale-105"
                />
              </button>
              <div className="p-3 flex items-center justify-between gap-2">
                <button onClick={() => setSelectedMovie(movie)} className="line-clamp-1 text-xs font-semibold text-white hover:text-red-500 transition text-left">
                  {movie.title || movie.name}
                </button>
                <button
                  onClick={() => {
                    const updated = list.filter((item) => item.id !== movie.id);
                    localStorage.setItem('streamflix_my_list', JSON.stringify(updated));
                    setList(updated);
                  }}
                  className="text-white/40 hover:text-red-500 transition p-1"
                  title="Remove from My List"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-20 text-center text-white/50">
          <p className="text-xl font-bold">Your list is empty</p>
          <p className="mt-2 text-sm">Click "+ Add to List" on any movie or show to save it here.</p>
        </div>
      )}
      {selectedMovie ? <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} /> : null}
    </main>
  );
};

export default MyList;
