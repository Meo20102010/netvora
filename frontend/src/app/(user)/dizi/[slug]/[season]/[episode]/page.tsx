import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentBySlug } from '@/lib/seo-fetch';
import {
  generateEpisodeMetadata,
  generateEpisodeSchema,
  generateEpisodeBreadcrumbs,
  parseSeasonParam,
  parseEpisodeParam,
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/seo';
import SeriesDetailClient from '@/components/SeriesDetailClient';
import Breadcrumb from '@/components/Breadcrumb';

interface EpisodePageProps {
  params: { slug: string; season: string; episode: string };
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const content = await getContentBySlug(params.slug);
  if (!content) {
    return { title: 'İçerik Bulunamadı | Netvora' };
  }
  const seasonNumber = parseSeasonParam(params.season);
  const episodeNumber = parseEpisodeParam(params.episode);
  const season = content.seasons?.find((s) => s.seasonNumber === seasonNumber);
  const episode = season?.episodes?.find((e) => e.episodeNumber === episodeNumber);
  if (!season || !episode) {
    return { title: 'Bölüm Bulunamadı | Netvora' };
  }
  return generateEpisodeMetadata(content, season, episode);
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const content = await getContentBySlug(params.slug);

  if (!content) {
    notFound();
  }

  if (content.type !== 'SERIES' && content.type !== 'ANIME') {
    notFound();
  }

  const seasonNumber = parseSeasonParam(params.season);
  const episodeNumber = parseEpisodeParam(params.episode);

  if (!seasonNumber || !episodeNumber) {
    notFound();
  }

  const season = content.seasons?.find((s) => s.seasonNumber === seasonNumber);
  const episode = season?.episodes?.find((e) => e.episodeNumber === episodeNumber);

  if (!season || !episode) {
    notFound();
  }

  const episodeSchema = generateEpisodeSchema(content, season, episode);
  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(episodeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Breadcrumb items={generateEpisodeBreadcrumbs(content, season, episode)} />
      <SeriesDetailClient
        content={content}
        id={content.id}
        initialSeason={seasonNumber}
        initialEpisode={episodeNumber}
      />
    </>
  );
}
