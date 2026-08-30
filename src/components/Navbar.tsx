import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import InstallAppButton from './InstallAppButton';

const navItems = [
  ['/', 'Home'],
  ['/tv-shows', 'TV Shows'],
  ['/movies', 'Movies'],
  ['/live-tv', 'Live TV'],
  ['/my-list', 'My List'],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (value) navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <nav className="fixed top-0 z-[100] w-full bg-gradient-to-b from-black via-black/80 to-transparent">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-6 px-4 md:px-10">
        <Link to="/" className="shrink-0 text-2xl font-black tracking-tight text-[#e50914] md:text-3xl">STREAMFLIX</Link>
        <div className="hidden items-center gap-5 md:flex">
          {navItems.map(([to, label]) => (
            <NavLink key={to} to={to} data-focusable data-nav-section="navbar" className={({ isActive }) => `text-sm text-white/70 transition hover:text-white ${isActive ? 'font-bold text-white' : ''}`}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={submit} className="hidden items-center rounded-full bg-black/40 px-1.5 ring-1 ring-white/10 sm:flex">
            <MagnifyingGlassIcon className="ml-3 h-5 w-5 text-white/70" />
            <input aria-label="Search movies and shows" data-focusable data-nav-section="navbar" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles" className="w-44 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 lg:w-64" />
          </form>
          <InstallAppButton />
          <button data-focusable data-nav-section="navbar" className="rounded-full p-2 hover:bg-white/10 sm:hidden" aria-label="Search" onClick={() => navigate('/search')}>
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
          <button data-focusable data-nav-section="navbar" className="rounded-full p-2 hover:bg-white/10 md:hidden" aria-label="Open menu" onClick={() => setOpen((value) => !value)}>
            {open ? <XMarkIcon className="h-6 w-6" /> : <span className="text-xl">☰</span>}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#141414] px-6 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {navItems.map(([to, label]) => (
              <NavLink key={to} to={to} data-focusable data-nav-section="navbar" onClick={() => setOpen(false)} className="text-base text-white/80">{label}</NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
