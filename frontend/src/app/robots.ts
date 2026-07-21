import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/film/', '/dizi/', '/browse/', '/search', '/login', '/register', '/subscription'],
      disallow: [
        '/admin',
        '/api',
        '/watch',
        '/account',
        '/profiles',
        '/list',
        '/continue-watching',
        '/notifications',
        '/new-releases',
        '/popular',
        '/trending',
        '/category',
        '/help',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
