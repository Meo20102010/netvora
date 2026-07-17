import { MetadataRoute } from 'next';

const BASE_URL = 'https://netvora.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/browse`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/browse/movies`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/browse/series`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/subscription`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const [moviesRes, seriesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/content?type=movie&limit=500`),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/content?type=series&limit=500`),
    ]);

    const moviesData = await moviesRes.json();
    const seriesData = await seriesRes.json();

    const movies = (moviesData?.data || []).map((item: any) => ({
      url: `${BASE_URL}/movie/${item.id}`,
      lastModified: new Date(item.updatedAt || item.createdAt || Date.now()),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    const series = (seriesData?.data || []).map((item: any) => ({
      url: `${BASE_URL}/series/${item.id}`,
      lastModified: new Date(item.updatedAt || item.createdAt || Date.now()),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...movies, ...series];
  } catch {
    return staticPages;
  }
}
