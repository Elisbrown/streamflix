/**
 * Vercel serverless function: /api/stream
 *
 * Fetches the streaming provider's embed page server-side and extracts
 * the underlying media sources (HLS m3u8, MP4, etc.) so the client can:
 *   - observe media through its own MediaObservationLayer
 *   - provide custom playback controls via postMessage
 *   - offer a real download path instead of a new-tab redirect
 *
 * The provider host is not exposed to the client; the proxy is the only
 * component that talks to it directly.
 */

const PROVIDER_BASE = 'https://moviesapi.to';
const THEME_PARAM = 'theme=E50914';

function buildProviderUrl(type, id, season, episode) {
  if (type === 'tv') {
    return `${PROVIDER_BASE}/tv/${id}/${season}/${episode}?${THEME_PARAM}`;
  }
  return `${PROVIDER_BASE}/movie/${id}?${THEME_PARAM}`;
}

function extractSources(html) {
  const sources = [];
  const seen = new Set();

  // m3u8 / m3u (HLS)
  const m3u8Re = /https?:\/\/[^\s"'<>\\)]+\.m3u8(?:\?[^\s"'<>\\)]*)?/gi;
  let match;
  while ((match = m3u8Re.exec(html)) !== null) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      sources.push({ url, type: 'hls', mime: 'application/vnd.apple.mpegurl' });
    }
  }

  // direct MP4
  const mp4Re = /https?:\/\/[^\s"'<>\\)]+\.mp4(?:\?[^\s"'<>\\)]*)?/gi;
  while ((match = mp4Re.exec(html)) !== null) {
    const url = match[0];
    if (!seen.has(url)) {
      seen.add(url);
      sources.push({ url, type: 'mp4', mime: 'video/mp4' });
    }
  }

  // source[src] attributes
  const srcRe = /<(?:source|video)[^>]*\bsrc=["']([^"']+)["']/gi;
  while ((match = srcRe.exec(html)) !== null) {
    const url = match[1];
    if (/^https?:/i.test(url) && !seen.has(url)) {
      seen.add(url);
      const lower = url.toLowerCase();
      const type = lower.includes('.m3u8') ? 'hls' : lower.includes('.mp4') ? 'mp4' : 'unknown';
      sources.push({ url, type, mime: type === 'hls' ? 'application/vnd.apple.mpegurl' : type === 'mp4' ? 'video/mp4' : '' });
    }
  }

  return sources;
}

function extractTitle(html) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) return decodeHtml(ogTitle[1]);
  const docTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (docTitle) return decodeHtml(docTitle[1].trim());
  return '';
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export default async function handler(req, res) {
  // CORS for client fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { type, id, season = '1', episode = '1' } = req.query;

  if (!type || !id || (type !== 'movie' && type !== 'tv')) {
    res.status(400).json({ error: 'Missing or invalid type/id' });
    return;
  }

  const providerUrl = buildProviderUrl(type, id, Number(season), Number(episode));

  try {
    const upstream = await fetch(providerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StreamflixProxy/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
      return;
    }

    const html = await upstream.text();
    const sources = extractSources(html);
    const title = extractTitle(html);

    // Cache briefly to reduce upstream load
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
    res.status(200).json({
      embedUrl: providerUrl,
      sources,
      title,
      mediaType: type,
      season: type === 'tv' ? Number(season) : undefined,
      episode: type === 'tv' ? Number(episode) : undefined,
    });
  } catch (err) {
    res.status(502).json({ error: 'Proxy fetch failed', detail: err?.message });
  }
}
