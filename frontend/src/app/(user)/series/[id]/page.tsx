import { redirect, notFound } from 'next/navigation';
import { getContentById } from '@/lib/seo-fetch';

interface SeriesPageProps {
  params: { id: string };
}

export default async function SeriesDetailPage({ params }: SeriesPageProps) {
  const content = await getContentById(params.id);

  if (!content) {
    notFound();
  }

  const target = content.type === 'MOVIE' ? `/film/${content.slug}` : `/dizi/${content.slug}`;
  redirect(target);
}
