import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { getAllContentForSitemap } from '@/lib/seo-fetch';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const contents = await getAllContentForSitemap();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/browse/movies`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/browse/series`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/browse/anime`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/subscription`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  for (const content of contents) {
    const lastModified = content.updatedAt ? new Date(content.updatedAt) : new Date();

    if (content.type === 'MOVIE' || content.type === 'ANIME') {
      dynamicRoutes.push({
        url: `${SITE_URL}/film/${content.slug}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    if (content.type === 'SERIES' || content.type === 'ANIME') {
      dynamicRoutes.push({
        url: `${SITE_URL}/dizi/${content.slug}`,
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });

      for (const season of content.seasons || []) {
        dynamicRoutes.push({
          url: `${SITE_URL}/dizi/${content.slug}/${season.seasonNumber}-sezon`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.7,
        });

        for (const episode of season.episodes || []) {
          dynamicRoutes.push({
            url: `${SITE_URL}/dizi/${content.slug}/${season.seasonNumber}-sezon/${episode.episodeNumber}-bolum`,
            lastModified,
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  }

  return [...staticRoutes, ...dynamicRoutes];
}
