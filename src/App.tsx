import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Movies from './pages/Movies';
import TVShows from './pages/TVShows';
import LiveTV from './pages/LiveTV';
import MyList from './pages/MyList';
import Search from './pages/Search';
import Watch from './pages/Watch';
import { SpatialNavProvider } from './hooks/useSpatialNav';
import { useEffect } from 'react';
import './App.css';
import { useOnlineStatus } from './hooks/useOnlineStatus';

function App() {
  const online = useOnlineStatus();

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isWebOS = /Web0S|webOS|SmartTV/i.test(ua);
    document.documentElement.classList.toggle('webos-tv', isWebOS);
    return () => document.documentElement.classList.remove('webos-tv');
  }, []);

  return (
    <BrowserRouter>
      <SpatialNavProvider>
        <div className="min-h-screen bg-[#141414] text-white">
          {!online && (
            <div
              role="status"
              className="fixed left-1/2 top-2 z-[200] -translate-x-1/2 rounded-full bg-black/85 px-4 py-2 text-xs font-semibold text-white/80 shadow-lg ring-1 ring-white/10"
            >
              Offline mode — using cached Streamflix content
            </div>
          )}
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/tv-shows" element={<TVShows />} />
            <Route path="/live-tv" element={<LiveTV />} />
            <Route path="/my-list" element={<MyList />} />
            <Route path="/search" element={<Search />} />
            <Route path="/watch/:mediaType/:id" element={<Watch />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SpatialNavProvider>
    </BrowserRouter>
  );
}

export default App;
