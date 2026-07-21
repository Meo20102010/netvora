import type { Metadata } from 'next';
import type { Content, Season, Episode, Category } from '@/types';

export const SITE_NAME = 'Netvora';
export const SITE_URL = 'https://netvora-green.vercel.app';
export const DEFAULT_LOCALE = 'tr';
export const SUPPORTED_LOCALES = ['tr', 'en'] as const;

const TURKISH_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u',
};

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (char) => TURKISH_MAP[char] || char)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function createSeoTitle(title: string, suffix?: string): string {
  const parts = [title.trim()];
  if (suffix) parts.push(suffix);
  parts.push(SITE_NAME);
  return parts.join(' | ');
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

export function generateKeywords(title: string, tags: string[] = [], type: 'movie' | 'series' | 'season' | 'episode' = 'movie'): string {
  const base = title.toLowerCase();
  const keywords: string[] = [
    `${base} izle`,
    `${base} full hd izle`,
    `${base} türkçe dublaj izle`,
    `${base} hd izle`,
  ];

  if (type === 'series') {
    keywords.push(`${base} son bölüm`, `${base} tüm bölümler`, `${base} tek parça`, 'türk dizisi izle');
  } else if (type === 'movie') {
    keywords.push(`${base} full izle`, `${base} 720p izle`, `${base} 1080p izle`, 'film izle', 'full film izle');
  } else if (type === 'season') {
    keywords.push(`${base} sezon izle`, `${base} tüm bölümler`, 'dizi sezonu izle');
  } else if (type === 'episode') {
    keywords.push(`${base} bölüm izle`, `${base} tek parça`, 'dizi bölümü izle');
  }

  tags.forEach((tag) => {
    const t = tag.toLowerCase();
    keywords.push(`${t} ${type === 'movie' ? 'filmleri' : 'dizileri'}`, `${t} izle`);
  });

  return Array.from(new Set(keywords)).join(', ');
}

export function getMovieUrl(slug: string): string {
  return `${SITE_URL}/film/${slug}`;
}

export function getSeriesUrl(slug: string): string {
  return `${SITE_URL}/dizi/${slug}`;
}

export function getSeasonUrl(seriesSlug: string, seasonNumber: number): string {
  return `${SITE_URL}/dizi/${seriesSlug}/${seasonNumber}-sezon`;
}

export function getEpisodeUrl(seriesSlug: string, seasonNumber: number, episodeNumber: number): string {
  return `${SITE_URL}/dizi/${seriesSlug}/${seasonNumber}-sezon/${episodeNumber}-bolum`;
}

export function getWatchUrl(contentId: string): string {
  return `${SITE_URL}/watch/${contentId}`;
}

export function getImageUrl(imageUrl?: string | null): string {
  if (!imageUrl) return `${SITE_URL}/icon.jpg`;
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${SITE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

export function generateMovieMetadata(content: Content): Metadata {
  const title = createSeoTitle(content.title, 'Full HD İzle');
  const description = truncate(
    content.description || `${content.title} filmini full hd kalitesinde Türkçe dublaj ve altyazılı izle. ${content.year ? content.year + ' yapımı ' : ''}${content.tags?.join(', ') || ''} filmi ${SITE_NAME}'da.`,
    160
  );
  const url = getMovieUrl(content.slug);
  const image = getImageUrl(content.posterUrl || content.coverUrl);
  const keywords = generateKeywords(content.title, content.tags, 'movie');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        tr: url,
        en: `${url}?lang=en`,
      },
    },
    openGraph: {
      type: 'video.movie',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: 'tr_TR',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: content.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export function generateSeriesMetadata(content: Content): Metadata {
  const title = createSeoTitle(content.title, 'Tüm Bölümler İzle');
  const description = truncate(
    content.description || `${content.title} dizisini tüm bölümleriyle full hd kalitede izle. ${content.year ? content.year + ' yapımı ' : ''}${content.tags?.join(', ') || ''} dizisi ${SITE_NAME}'da.`,
    160
  );
  const url = getSeriesUrl(content.slug);
  const image = getImageUrl(content.posterUrl || content.coverUrl);
  const keywords = generateKeywords(content.title, content.tags, 'series');

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        tr: url,
        en: `${url}?lang=en`,
      },
    },
    openGraph: {
      type: 'video.tv_show',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: 'tr_TR',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: content.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function generateSeasonMetadata(content: Content, season: Season): Metadata {
  const suffix = `${season.seasonNumber}. Sezon Tüm Bölümler`;
  const title = createSeoTitle(content.title, suffix);
  const description = truncate(
    `${content.title} ${season.seasonNumber}. sezon tüm bölümleriyle birlikte full hd kalitede izle. ${season.title || ''} ${SITE_NAME}'da.`,
    160
  );
  const url = getSeasonUrl(content.slug, season.seasonNumber);
  const image = getImageUrl(content.posterUrl || content.coverUrl);
  const keywords = generateKeywords(`${content.title} ${season.seasonNumber}. sezon`, content.tags, 'season');

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'video.tv_show',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: 'tr_TR',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export function generateEpisodeMetadata(content: Content, season: Season, episode: Episode): Metadata {
  const suffix = `${season.seasonNumber}. Sezon ${episode.episodeNumber}. Bölüm`;
  const title = createSeoTitle(content.title, suffix);
  const description = truncate(
    `${content.title} ${season.seasonNumber}. sezon ${episode.episodeNumber}. bölümü tek parça full hd izle. ${episode.description || ''}`,
    160
  );
  const url = getEpisodeUrl(content.slug, season.seasonNumber, episode.episodeNumber);
  const image = getImageUrl(episode.stillUrl || content.posterUrl || content.coverUrl);
  const keywords = generateKeywords(`${content.title} ${season.seasonNumber}. sezon ${episode.episodeNumber}. bölüm`, content.tags, 'episode');

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'video.episode',
      url,
      siteName: SITE_NAME,
      title,
      description,
      locale: 'tr_TR',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

// JSON-LD Schemas
export function generateMovieSchema(content: Content) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: content.title,
    description: content.description || `${content.title} filmini izle`,
    image: getImageUrl(content.posterUrl || content.coverUrl),
    url: getMovieUrl(content.slug),
    dateCreated: content.year?.toString(),
    duration: content.duration ? `PT${content.duration}M` : undefined,
    genre: content.tags || [],
    director: content.director ? { '@type': 'Person', name: content.director } : undefined,
    actor: content.cast?.map((name: string) => ({ '@type': 'Person', name })) || [],
    aggregateRating: content.imdbRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: content.imdbRating.toString(),
          bestRating: '10',
          worstRating: '1',
        }
      : undefined,
  };
}

export function generateSeriesSchema(content: Content) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: content.title,
    description: content.description || `${content.title} dizisini izle`,
    image: getImageUrl(content.posterUrl || content.coverUrl),
    url: getSeriesUrl(content.slug),
    datePublished: content.year?.toString(),
    genre: content.tags || [],
    director: content.director ? { '@type': 'Person', name: content.director } : undefined,
    actor: content.cast?.map((name: string) => ({ '@type': 'Person', name })) || [],
    numberOfSeasons: content.seasons?.length,
    containsSeason: content.seasons?.map((season) => ({
      '@type': 'TVSeason',
      seasonNumber: season.seasonNumber,
      name: season.title || `${season.seasonNumber}. Sezon`,
      url: getSeasonUrl(content.slug, season.seasonNumber),
      numberOfEpisodes: season.episodes?.length,
    })),
    aggregateRating: content.imdbRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: content.imdbRating.toString(),
          bestRating: '10',
          worstRating: '1',
        }
      : undefined,
  };
}

export function generateSeasonSchema(content: Content, season: Season) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeason',
    seasonNumber: season.seasonNumber,
    name: season.title || `${content.title} ${season.seasonNumber}. Sezon`,
    description: `${content.title} ${season.seasonNumber}. sezon tüm bölümleri`,
    url: getSeasonUrl(content.slug, season.seasonNumber),
    image: getImageUrl(content.posterUrl || content.coverUrl),
    partOfSeries: {
      '@type': 'TVSeries',
      name: content.title,
      url: getSeriesUrl(content.slug),
    },
    numberOfEpisodes: season.episodes?.length,
    episode: season.episodes?.map((episode) => ({
      '@type': 'TVEpisode',
      episodeNumber: episode.episodeNumber,
      name: episode.title,
      url: getEpisodeUrl(content.slug, season.seasonNumber, episode.episodeNumber),
    })),
  };
}

export function generateEpisodeSchema(content: Content, season: Season, episode: Episode) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TVEpisode',
    episodeNumber: episode.episodeNumber,
    name: episode.title,
    description: episode.description || `${content.title} ${season.seasonNumber}. sezon ${episode.episodeNumber}. bölüm`,
    url: getEpisodeUrl(content.slug, season.seasonNumber, episode.episodeNumber),
    image: getImageUrl(episode.stillUrl || content.posterUrl || content.coverUrl),
    partOfSeries: {
      '@type': 'TVSeries',
      name: content.title,
      url: getSeriesUrl(content.slug),
    },
    partOfSeason: {
      '@type': 'TVSeason',
      seasonNumber: season.seasonNumber,
      url: getSeasonUrl(content.slug, season.seasonNumber),
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url || '#',
    })),
  };
}

export function parseSeasonParam(param: string): number | null {
  const match = param.match(/^(\d+)-sezon$/i);
  return match ? parseInt(match[1], 10) : null;
}

export function parseEpisodeParam(param: string): number | null {
  const match = param.match(/^(\d+)-bolum$/i);
  return match ? parseInt(match[1], 10) : null;
}

export function generateMovieBreadcrumbs(content: Content): BreadcrumbItem[] {
  return [
    { name: 'Ana Sayfa', url: SITE_URL },
    { name: 'Filmler', url: `${SITE_URL}/browse/movies` },
    { name: content.title, url: getMovieUrl(content.slug) },
  ];
}

export function generateSeriesBreadcrumbs(content: Content): BreadcrumbItem[] {
  return [
    { name: 'Ana Sayfa', url: SITE_URL },
    { name: 'Diziler', url: `${SITE_URL}/browse/series` },
    { name: content.title, url: getSeriesUrl(content.slug) },
  ];
}

export function generateSeasonBreadcrumbs(content: Content, season: Season): BreadcrumbItem[] {
  return [
    ...generateSeriesBreadcrumbs(content).slice(0, -1),
    { name: content.title, url: getSeriesUrl(content.slug) },
    { name: `${season.seasonNumber}. Sezon`, url: getSeasonUrl(content.slug, season.seasonNumber) },
  ];
}

export function generateEpisodeBreadcrumbs(content: Content, season: Season, episode: Episode): BreadcrumbItem[] {
  return [
    ...generateSeasonBreadcrumbs(content, season).slice(0, -1),
    { name: `${season.seasonNumber}. Sezon`, url: getSeasonUrl(content.slug, season.seasonNumber) },
    { name: `${episode.episodeNumber}. Bölüm`, url: getEpisodeUrl(content.slug, season.seasonNumber, episode.episodeNumber) },
  ];
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon.jpg`,
      width: 512,
      height: 512,
    },
    sameAs: [],
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'tr',
  };
}
