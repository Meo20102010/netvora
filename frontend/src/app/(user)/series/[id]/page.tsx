import { redirect, notFound } from 'next/navigation';
import { getSlugById } from '@/lib/seo-fetch';

interface SeriesPageProps {
  params: { id: string };
}

export default async function SeriesDetailPage({ params }: SeriesPageProps) {
  const content = await getSlugById(params.id);

  if (!content) {
    notFound();
  }

  const target = content.type === 'MOVIE' ? `/film/${content.slug}` : `/dizi/${content.slug}`;
  redirect(target);
}
