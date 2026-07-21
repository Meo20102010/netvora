import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentBySlug } from '@/lib/seo-fetch';
import {
  generateSeasonMetadata,
  generateSeasonSchema,
  generateSeasonBreadcrumbs,
  parseSeasonParam,
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/seo';
import SeriesDetailClient from '@/components/SeriesDetailClient';
import Breadcrumb from '@/components/Breadcrumb';

interface SeasonPageProps {
  params: { slug: string; season: string };
}

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const content = await getContentBySlug(params.slug);
  if (!content) {
    return { title: 'İçerik Bulunamadı | Netvora' };
  }
  const seasonNumber = parseSeasonParam(params.season);
  const season = content.seasons?.find((s) => s.seasonNumber === seasonNumber);
  if (!season) {
    return { title: 'Sezon Bulunamadı | Netvora' };
  }
  return generateSeasonMetadata(content, season);
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const content = await getContentBySlug(params.slug);

  if (!content) {
    notFound();
  }

  if (content.type !== 'SERIES' && content.type !== 'ANIME') {
    notFound();
  }

  const seasonNumber = parseSeasonParam(params.season);

  if (!seasonNumber) {
    notFound();
  }

  const season = content.seasons?.find((s) => s.seasonNumber === seasonNumber);

  if (!season) {
    notFound();
  }

  const seasonSchema = generateSeasonSchema(content, season);
  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seasonSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Breadcrumb items={generateSeasonBreadcrumbs(content, season)} />
      <SeriesDetailClient content={content} id={content.id} initialSeason={seasonNumber} />
    </>
  );
}
