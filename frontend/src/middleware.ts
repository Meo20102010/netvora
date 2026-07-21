import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/movie/:id*', '/series/:id*'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const match = pathname.match(/^\/(movie|series)\/([^/]+)$/);
  if (!match) return NextResponse.next();

  const [, type, id] = match;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/content/${encodeURIComponent(id)}`, {
      headers: { 'User-Agent': 'netvora-middleware/1.0' },
    });
    if (!res.ok) return NextResponse.next();
    const json = await res.json();
    const content = json.data;
    if (!content || !content.slug) return NextResponse.next();

    const targetType = content.type === 'SERIES' ? 'dizi' : 'film';
    const targetUrl = new URL(`/${targetType}/${content.slug}`, request.url);
    return NextResponse.redirect(targetUrl, 301);
  } catch {
    return NextResponse.next();
  }
}
