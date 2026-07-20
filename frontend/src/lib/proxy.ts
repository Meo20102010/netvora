export function proxyImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('https://image.kanald.com.tr/')) return '/api/proxy/image/' + url.slice('https://image.kanald.com.tr/'.length);
  return url;
}

const EMBED_DOMAINS = [
  'rapidvid.net',
  'vidmoly.to',
  'vidplay.net',
  'vidsrc.to',
  'trplayer.com',
  'sobreatsesuyp.com',
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'ok.ru',
  'vk.com',
  'mail.ru',
];

function isEmbedUrl(url: string): boolean {
  return EMBED_DOMAINS.some((d) => url.includes(d)) || url.includes('/embed') || url.includes('/iframe');
}

export function proxyVideoUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  // Embed URLs (iframes) must not be proxied; load directly in iframe
  if (isEmbedUrl(url)) return url;
  if (url.startsWith('https://kanaldvod.duhnet.tv/')) return '/api/proxy/vod/' + url.slice('https://kanaldvod.duhnet.tv/'.length);
  if (url.startsWith('S') || url.startsWith('/S')) {
    const path = url.startsWith('/') ? url : '/' + url;
    return '/api/proxy/vod' + path;
  }
  if (url.includes('res.cloudinary.com') || url.includes('cloudfront.net') || url.includes('r2.cloudflarestorage.com') || url.includes('b-cdn.net') || url.includes('cdn.bunnycdn.com')) {
    return url;
  }
  if (url.startsWith('http')) return '/api/proxy/ext?url=' + encodeURIComponent(url);
  return url;
}
