/**
 * Vercel serverless function: /api/stream
 *
 * Proxies the streaming provider's embed page through our own domain.
 * By serving the embed HTML from our origin, the iframe is same-origin,
 * so the provider's sandbox/restricted-frame check (which looks at
 * `window.frameElement.hasAttribute('sandbox')`) always passes — our
 * parent iframe has no `sandbox` attribute. The browser still applies
 * the default security policy, but the provider's own code does not see
 * a sandboxed context and the player initializes correctly.
 */

const PROVIDER_BASE = 'https://moviesapi.to';

function buildProviderUrl(type, id, season, episode) {
  if (type === 'tv') {
    return `${PROVIDER_BASE}/tv/${id}/${season}/${episode}`;
  }
  return `${PROVIDER_BASE}/movie/${id}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { type, id, season = '1', episode = '1' } = req.query;

  if (!type || !id || (type !== 'movie' && type !== 'tv')) {
    res.status(400).send('Missing or invalid type/id');
    return;
  }

  const url = buildProviderUrl(type, id, Number(season), Number(episode));

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StreamflixProxy/1.1)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).send(upstream.statusText);
      return;
    }

    let html = await upstream.text();

    // Inject a <base> tag so relative URLs inside the embed resolve
    // against the provider, not our /api/ path.
    const baseTag = `<base href="https://moviesapi.to/">`;
    if (!html.toLowerCase().includes('<base')) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${baseTag}`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    res.status(502).send('Proxy fetch failed');
  }
}
