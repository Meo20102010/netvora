import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentBySlug } from '@/lib/seo-fetch';
import {
  generateMovieMetadata,
  generateMovieSchema,
  generateMovieBreadcrumbs,
  generateOrganizationSchema,
  generateWebSiteSchema,
} from '@/lib/seo';
import MovieDetailClient from '@/components/MovieDetailClient';
import Breadcrumb from '@/components/Breadcrumb';

interface FilmPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: FilmPageProps): Promise<Metadata> {
  const content = await getContentBySlug(params.slug);
  if (!content) {
    return { title: 'İçerik Bulunamadı | Netvora' };
  }
  return generateMovieMetadata(content);
}

export default async function FilmPage({ params }: FilmPageProps) {
  const content = await getContentBySlug(params.slug);

  if (!content) {
    notFound();
  }

  if (content.type !== 'MOVIE' && content.type !== 'ANIME') {
    notFound();
  }

  const movieSchema = generateMovieSchema(content);
  const orgSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(movieSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <Breadcrumb items={generateMovieBreadcrumbs(content)} />
      <MovieDetailClient content={content} id={content.id} />
    </>
  );
}
