import { MetadataRoute } from 'next';

const BASE_URL = 'https://netvora.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/browse`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/browse/movies`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/browse/series`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/trending`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/popular`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/new-releases`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/subscription`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    const [moviesRes, seriesRes] = await Promise.all([
      fetch(`${apiBase}/content?type=movie&limit=500`),
      fetch(`${apiBase}/content?type=series&limit=500`),
    ]);

    const moviesData = await moviesRes.json();
    const seriesData = await seriesRes.json();

    const movies = (moviesData?.data || []).map((item: any) => ({
      url: `${BASE_URL}/movie/${item.id}`,
      lastModified: new Date(item.updatedAt || item.createdAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const series = (seriesData?.data || []).map((item: any) => ({
      url: `${BASE_URL}/series/${item.id}`,
      lastModified: new Date(item.updatedAt || item.createdAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...movies, ...series];
  } catch {
    return staticPages;
  }
}
