import { useState } from 'react';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import { Movie } from '../services/api.config';

const TVShows = () => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const rows = [
    ['Netflix Originals', 'netflixOriginals' as const],
    ['Trending Shows', 'trending' as const],
    ['Top Rated', 'topRated' as const],
  ];

  return (
    <main className="min-h-screen bg-[#141414] px-4 pb-16 pt-24 text-white md:px-10">
      <h1 className="mb-8 text-4xl font-bold">TV Shows</h1>
      {rows.map(([title, endpoint]) => (
        <MovieRow key={endpoint} title={title} endpoint={endpoint} onMovieClick={setSelectedMovie} />
      ))}
      {selectedMovie ? <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} /> : null}
    </main>
  );
};

export default TVShows;
