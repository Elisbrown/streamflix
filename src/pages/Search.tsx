import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieModal from '../components/MovieModal';
import { BASE_URL, IMAGE_BASE_URL, Movie, TMDB_API_KEY } from '../services/api.config';

const Search = () => {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [results, setResults] = useState<Movie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);

  useEffect(() => {
    const q = params.get('q')?.trim() || '';
    if (!q) {
      setResults([]);
      return;
    }
    axios.get(`${BASE_URL}/search/multi`, { params: { api_key: TMDB_API_KEY, query: q, include_adult: false } })
      .then((response) => setResults((response.data.results || []).filter((item: Movie & { media_type?: string }) => item.media_type === 'movie' || item.media_type === 'tv')))
      .catch(() => setResults([]));
  }, [params]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    setParams(q ? { q } : {});
  };

  return (
    <main className="min-h-screen bg-[#141414] px-4 pb-16 pt-24 text-white md:px-10">
      <form onSubmit={submit} className="mb-8 flex max-w-2xl gap-2">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies and TV shows" className="min-w-0 flex-1 rounded-full bg-white/10 px-6 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-white/30" />
        <button className="rounded-full bg-white px-6 py-3 font-bold text-black shadow-lg transition hover:bg-white/80">Search</button>
      </form>
      {params.get('q') ? <h1 className="mb-6 text-2xl font-bold">Results for “{params.get('q')}”</h1> : <p className="text-white/40">Search the TMDB catalog.</p>}
      {results.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
          {results.map((movie) => (
            <button key={`${movie.media_type}-${movie.id}`} onClick={() => setSelected(movie)} className="overflow-hidden rounded-xl bg-[#181818] text-left ring-1 ring-white/10">
              <img src={`${IMAGE_BASE_URL}/w500${movie.poster_path}`} alt={movie.title || movie.name || ''} className="aspect-[2/3] w-full object-cover transition hover:scale-105" />
              <div className="p-3"><div className="line-clamp-2 text-xs font-semibold">{movie.title || movie.name}</div></div>
            </button>
          ))}
        </div>
      ) : params.get('q') ? <div className="py-20 text-center text-white/40">No results found.</div> : null}
      {selected ? <MovieModal movie={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
};

export default Search;
