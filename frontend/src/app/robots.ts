import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/profiles', '/account'] },
    ],
    sitemap: 'https://netvora.com/sitemap.xml',
  };
}
