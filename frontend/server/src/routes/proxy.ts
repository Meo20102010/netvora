import { Router, Request, Response } from 'express';

const router = Router();

const IMAGE_HOST = 'https://image.kanald.com.tr';
const VOD_HOST = 'https://kanaldvod.duhnet.tv';

// Image proxy: /api/proxy/image/* -> https://image.kanald.com.tr/*
router.get('/image/*', async (req: Request, res: Response) => {
  const path = req.params[0] || '';
  const upstreamUrl = new URL(path, IMAGE_HOST + '/').href;
  await proxyAndPipe(req, res, upstreamUrl);
});

// Video proxy: /api/proxy/vod/* -> https://kanaldvod.duhnet.tv/*
router.get('/vod/*', async (req: Request, res: Response) => {
  const path = req.params[0] || '';
  const upstreamUrl = new URL(path, VOD_HOST + '/').href;
  await proxyAndPipe(req, res, upstreamUrl);
});

// Generic external proxy: /api/proxy/ext?url=ENCODED_URL
router.get('/ext', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' });
  }
  await proxyAndPipe(req, res, url, true);
});

async function proxyAndPipe(req: Request, res: Response, upstreamUrl: string, isGeneric = false) {
  try {
    const upstream = new URL(upstreamUrl);

    const headers: Record<string, string> = {
      'User-Agent': (req.headers['user-agent'] as string) || 'Mozilla/5.0',
      Accept: (req.headers['accept'] as string) || '*/*',
      'Accept-Language': (req.headers['accept-language'] as string) || 'tr,en;q=0.9',
    };
    if (!isGeneric) {
      headers['Referer'] = 'https://www.kanald.com.tr/';
    }

    if (req.headers.range) {
      headers['Range'] = req.headers.range as string;
    }

    const response = await fetch(upstreamUrl, { headers });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).json({ error: 'Proxy error', status: response.status });
    }

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (response.status === 206) res.setHeader('Accept-Ranges', 'bytes');

    if (upstream.pathname.includes('/image/')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }

    res.status(response.status);

    // For HLS playlists, rewrite segment URLs to use proxy
    if (contentType && (contentType.includes('mpegurl') || contentType.includes('x-mpegURL'))) {
      let text = await response.text();
      // Get base path for relative URL resolution
      const urlObj = new URL(upstreamUrl);
      const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
      text = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('http')) return line;
        // Resolve relative URL against base, then rewrite to proxy
        const resolved = new URL(trimmed, VOD_HOST + basePath).href;
        const proxyPath = resolved.slice(VOD_HOST.length);
        return '/api/proxy/vod' + proxyPath;
      }).join('\n');
      return res.send(text);
    }

    // Stream response body
    const body = response.body;
    if (body) {
      for await (const chunk of body as any) {
        res.write(chunk);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err: any) {
    res.status(502).json({ error: 'Proxy failed', message: err.message });
  }
}

export default router;
