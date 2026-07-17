export function proxyImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('https://image.kanald.com.tr/')) return '/api/proxy/image/' + url.slice('https://image.kanald.com.tr/'.length);
  return url;
}

export function proxyVideoUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('https://kanaldvod.duhnet.tv/')) return '/api/proxy/vod/' + url.slice('https://kanaldvod.duhnet.tv/'.length);
  if (url.startsWith('S') || url.startsWith('/S')) {
    const path = url.startsWith('/') ? url : '/' + url;
    return '/api/proxy/vod' + path;
  }
  if (url.startsWith('http')) return '/api/proxy/ext?url=' + encodeURIComponent(url);
  return url;
}
