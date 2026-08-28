import axios from 'axios';
import Hls from 'hls.js';
import {
  PlayIcon,
  TvIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  LinkIcon,
} from '@heroicons/react/24/solid';
import { useEffect, useRef, useState } from 'react';

export interface IptvChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

export function parseM3u(content: string): IptvChannel[] {
  const lines = content.split(/\r?\n/);
  const channels: IptvChannel[] = [];
  let currentChannel: Partial<IptvChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const nameParts = line.split(',');
      const name = nameParts.length > 1 ? nameParts.slice(1).join(',').trim() : 'Unknown Channel';

      currentChannel = {
        name,
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch && groupMatch[1] ? groupMatch[1] : 'General',
      };
    } else if (line && !line.startsWith('#')) {
      if (currentChannel && !line.endsWith('.m3u')) {
        currentChannel.url = line;
        currentChannel.id = `${channels.length + 1}-${currentChannel.name}`;
        channels.push(currentChannel as IptvChannel);
        currentChannel = null;
      }
    }
  }

  return channels;
}

const VERIFIED_FEATURED_CHANNELS: IptvChannel[] = [
  {
    id: 'featured-movies-1',
    name: 'FilmRise Free Movies',
    logo: 'https://i.imgur.com/X45k9l2.png',
    group: 'Movies',
    url: 'https://filmrise-movies-1-us.samsung.wurl.tv/playlist.m3u8',
  },
  {
    id: 'featured-movies-2',
    name: 'FilmRise Action Movies',
    logo: 'https://i.imgur.com/L53k2l9.png',
    group: 'Movies',
    url: 'https://filmrise-action-1-us.samsung.wurl.tv/playlist.m3u8',
  },
  {
    id: 'featured-movies-3',
    name: 'Pluto TV Movies',
    logo: 'https://i.imgur.com/8k1L5m3.png',
    group: 'Movies',
    url: 'https://pluto-tv-movies-1-us.samsung.wurl.tv/playlist.m3u8',
  },
  {
    id: 'featured-movies-4',
    name: 'Rakuten Action Movies',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Rakuten_TV_logo.svg/512px-Rakuten_TV_logo.svg.png',
    group: 'Movies',
    url: 'https://rakuten-actionmovies-1-eu.wurl.tv/playlist.m3u8',
  },
  {
    id: 'featured-movies-5',
    name: 'Classic Cinema Movies',
    logo: 'https://i.imgur.com/3pZ0X9q.png',
    group: 'Movies',
    url: 'https://video2.getstreamhosting.com:1936/100percentclassichits/100percentclassichits/playlist.m3u8',
  },
  {
    id: 'featured-1',
    name: 'Bloomberg Television',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bloomberg_Television_logo.svg/512px-Bloomberg_Television_logo.svg.png',
    group: 'News',
    url: 'https://live-bloomberg-us.amagi.tv/playlist.m3u8',
  },
  {
    id: 'featured-2',
    name: 'Red Bull TV',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png',
    group: 'Sports',
    url: 'https://rbmn-live.akamaized.net/hls/live/591070/GEO_US/master.m3u8',
  },
  {
    id: 'featured-3',
    name: 'France 24 English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/France24.svg/512px-France24.svg.png',
    group: 'News',
    url: 'https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8',
  },
  {
    id: 'featured-4',
    name: 'DW News English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol.svg/512px-Deutsche_Welle_symbol.svg.png',
    group: 'News',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
  },
  {
    id: 'featured-5',
    name: 'Euronews English',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Euronews_logo_2016.svg/512px-Euronews_logo_2016.svg.png',
    group: 'News',
    url: 'https://euronews-euronews-live-1-us.samsung.wurl.tv/playlist.m3u8',
  },
  {
    id: 'featured-6',
    name: 'NASA TV Public',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg',
    group: 'Science',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
  },
  {
    id: 'featured-7',
    name: 'CGTN America',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/CGTN_logo.svg/512px-CGTN_logo.svg.png',
    group: 'News',
    url: 'https://news.cgtn.com/resource/hls/live/cgtn/cgtn.m3u8',
  },
  {
    id: 'featured-8',
    name: 'Al Jazeera English',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Al_Jazeera_English_logo.svg/512px-Al_Jazeera_English_logo.svg.png',
    group: 'News',
    url: 'https://live-hls-web-aje.akamaized.net/custom/aje/index.m3u8',
  },
];

const CATEGORY_PLAYLISTS = [
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  'https://iptv-org.github.io/iptv/categories/series.m3u',
  'https://iptv-org.github.io/iptv/categories/news.m3u',
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://iptv-org.github.io/iptv/categories/music.m3u',
  'https://iptv-org.github.io/iptv/categories/animation.m3u',
  'https://iptv-org.github.io/iptv/languages/eng.m3u',
];

export default function LiveTV() {
  const [channels, setChannels] = useState<IptvChannel[]>(VERIFIED_FEATURED_CHANNELS);
  const [currentChannel, setCurrentChannel] = useState<IptvChannel | null>(VERIFIED_FEATURED_CHANNELS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [loading, setLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch and parse IPTV category playlists
  useEffect(() => {
    let active = true;

    async function loadPlaylist() {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          CATEGORY_PLAYLISTS.map((url) => fetch(url).then((res) => res.text()))
        );

        const fetchedChannels: IptvChannel[] = [];
        results.forEach((res) => {
          if (res.status === 'fulfilled' && res.value) {
            fetchedChannels.push(...parseM3u(res.value));
          }
        });

        // Combine verified high-availability channels with category channels
        const combined = [...VERIFIED_FEATURED_CHANNELS, ...fetchedChannels];

        if (active) {
          setChannels(combined);
          if (!currentChannel) {
            setCurrentChannel(combined[0]);
          }
        }
      } catch {
        if (active) {
          setChannels(VERIFIED_FEATURED_CHANNELS);
          if (!currentChannel) setCurrentChannel(VERIFIED_FEATURED_CHANNELS[0]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPlaylist();

    return () => {
      active = false;
    };
  }, []);

  const loadCustomPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(customUrl.trim());
      const parsed = parseM3u(res.data);
      if (parsed.length > 0) {
        setChannels(parsed);
        setCurrentChannel(parsed[0]);
        setShowCustomModal(false);
      } else {
        alert('No valid channels found in this M3U file.');
      }
    } catch {
      alert('Failed to load custom M3U playlist URL.');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Hls.js stream player when currentChannel changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentChannel?.url) return;

    setStreamError(null);
    setIsPlayerLoading(true);

    let hls: Hls | null = null;

    const playStream = (streamUrl: string) => {
      if (Hls.isSupported()) {
        if (hls) hls.destroy();

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingTimeOut: 10000,
          manifestLoadingMaxRetry: 2,
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsPlayerLoading(false);
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            // Attempt CORS proxy fallback if direct stream fails
            if (!streamUrl.includes('corsproxy.io')) {
              playStream(`https://corsproxy.io/?${encodeURIComponent(currentChannel.url)}`);
            } else {
              setIsPlayerLoading(false);
              setStreamError('This broadcast stream is currently unreachable.');
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.onloadedmetadata = () => {
          setIsPlayerLoading(false);
          video.play().catch(() => {});
        };
        video.onerror = () => {
          setIsPlayerLoading(false);
          setStreamError('This broadcast stream is currently unreachable.');
        };
      } else {
        setIsPlayerLoading(false);
        setStreamError('HLS streaming is not supported in this browser.');
      }
    };

    playStream(currentChannel.url);

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentChannel]);

  // Categories list
  const groups = ['All', 'Movies', ...Array.from(new Set(channels.map((c) => c.group).filter(Boolean)))].filter(
    (item, index, self) => self.indexOf(item) === index
  ).slice(0, 15);

  // Filter channels
  const filteredChannels = channels.filter((ch) => {
    const matchesGroup =
      selectedGroup === 'All'
        ? true
        : selectedGroup === 'Movies'
        ? ch.group.toLowerCase().includes('movie') || ch.name.toLowerCase().includes('movie') || ch.group === 'Movies'
        : ch.group === selectedGroup;

    const matchesQuery = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesQuery;
  });

  const currentIndex = currentChannel
    ? filteredChannels.findIndex((c) => c.id === currentChannel.id)
    : -1;

  const handlePrevChannel = () => {
    if (currentIndex > 0) {
      setCurrentChannel(filteredChannels[currentIndex - 1]);
    }
  };

  const handleNextChannel = () => {
    if (currentIndex !== -1 && currentIndex < filteredChannels.length - 1) {
      setCurrentChannel(filteredChannels[currentIndex + 1]);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <main className="min-h-screen bg-[#141414] pb-12 pt-20 text-white">
      <div className="mx-auto max-w-[1800px] px-4 md:px-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TvIcon className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-black text-white md:text-3xl">Live IPTV Channels & Movies</h1>
              <p className="text-xs text-white/60">Watch free live movie channels & broadcast streams worldwide</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCustomModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <LinkIcon className="h-4 w-4" /> Custom M3U
            </button>

            <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 ring-1 ring-white/10">
              <MagnifyingGlassIcon className="h-5 w-5 text-white/50" />
              <input
                type="text"
                placeholder="Search channels & movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-white/40 md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition whitespace-nowrap ${
                selectedGroup === group
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Main Grid: Player + Channel Drawer */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Player Container */}
          <div className="flex flex-col gap-4">
            <div
              ref={containerRef}
              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10"
            >
              {isPlayerLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                  <span className="text-xs font-semibold text-white/70">Connecting live stream...</span>
                </div>
              )}

              {streamError ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mb-2" />
                  <h3 className="text-lg font-bold text-white">Stream Unavailable</h3>
                  <p className="mt-1 text-xs text-white/60 max-w-sm">{streamError}</p>
                  <button
                    onClick={handleNextChannel}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 shadow-lg"
                  >
                    Try Next Channel <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <video
                ref={videoRef}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />

              {/* Player Top Controls */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="rounded-full bg-black/60 p-2 text-white hover:bg-black transition"
                  title="Fullscreen"
                >
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Currently Playing Channel Bar */}
            {currentChannel && (
              <div className="flex items-center justify-between rounded-2xl bg-[#181818] p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-4">
                  {currentChannel.logo ? (
                    <img
                      src={currentChannel.logo}
                      alt={currentChannel.name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="h-10 w-10 object-contain rounded bg-black/40 p-1"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-red-600/20 text-red-500 font-bold">
                      TV
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-white text-base md:text-lg">{currentChannel.name}</h2>
                    <span className="text-xs text-white/50 uppercase font-semibold">{currentChannel.group}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevChannel}
                    disabled={currentIndex <= 0}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition"
                    title="Previous Channel"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleNextChannel}
                    disabled={currentIndex >= filteredChannels.length - 1}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition"
                    title="Next Channel"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Channel List Sidebar */}
          <div className="flex flex-col rounded-2xl bg-[#181818] p-4 ring-1 ring-white/10 max-h-[680px]">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                Channels ({filteredChannels.length})
              </h3>
              <button
                onClick={() => {
                  setLoading(true);
                  Promise.allSettled(CATEGORY_PLAYLISTS.map((url) => fetch(url).then((res) => res.text()))).then((results) => {
                    const fetched: IptvChannel[] = [];
                    results.forEach((res) => {
                      if (res.status === 'fulfilled' && res.value) fetched.push(...parseM3u(res.value));
                    });
                    const combined = [...VERIFIED_FEATURED_CHANNELS, ...fetched];
                    setChannels(combined);
                  }).finally(() => setLoading(false));
                }}
                className="text-white/60 hover:text-white transition"
                title="Reload List"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
                <span className="text-xs text-white/60">Loading IPTV channels...</span>
              </div>
            ) : filteredChannels.length > 0 ? (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 scrollbar-thin">
                {filteredChannels.map((ch) => {
                  const isActive = currentChannel?.id === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setCurrentChannel(ch)}
                      className={`flex items-center gap-3 rounded-xl p-2.5 text-left text-xs font-semibold transition ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          className="h-7 w-7 object-contain rounded shrink-0 bg-black/40 p-0.5"
                        />
                      ) : (
                        <TvIcon className="h-5 w-5 shrink-0 opacity-60" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-bold">{ch.name}</p>
                        <p className="text-[10px] opacity-70 truncate">{ch.group}</p>
                      </div>
                      {isActive && <PlayIcon className="h-4 w-4 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-white/40">No channels match your search.</div>
            )}
          </div>
        </div>
      </div>

      {/* Custom M3U Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#181818] p-6 shadow-2xl ring-1 ring-white/10">
            <h2 className="text-xl font-bold text-white mb-2">Load Custom M3U Playlist</h2>
            <p className="text-xs text-white/60 mb-6">Paste any M3U or M3U8 IPTV playlist URL to load custom live channels.</p>
            <form onSubmit={loadCustomPlaylist} className="flex flex-col gap-4">
              <input
                type="url"
                required
                placeholder="https://example.com/playlist.m3u"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full rounded-full bg-white/10 px-5 py-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-white/30"
              />
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="rounded-full bg-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition shadow-lg"
                >
                  Load Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
