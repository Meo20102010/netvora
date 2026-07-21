import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentBySlug } from '@/lib/seo-fetch';
import {
  generateSeriesMetadata,
  generateSeriesSchema,
  generateSeriesBreadcrumbs,
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/seo';
import SeriesDetailClient from '@/components/SeriesDetailClient';
import Breadcrumb from '@/components/Breadcrumb';

interface DiziPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: DiziPageProps): Promise<Metadata> {
  const content = await getContentBySlug(params.slug);
  if (!content) {
    return { title: 'İçerik Bulunamadı | Netvora' };
  }
  return generateSeriesMetadata(content);
}

export default async function DiziPage({ params }: DiziPageProps) {
  const content = await getContentBySlug(params.slug);

  if (!content) {
    notFound();
  }

  if (content.type !== 'SERIES' && content.type !== 'ANIME') {
    notFound();
  }

  const seriesSchema = generateSeriesSchema(content);
  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Breadcrumb items={generateSeriesBreadcrumbs(content)} />
      <SeriesDetailClient content={content} id={content.id} />
    </>
  );
}
