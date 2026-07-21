import { redirect, notFound } from 'next/navigation';
import { getSlugById } from '@/lib/seo-fetch';

interface SeriesRedirectPageProps {
  params: { id: string };
}

export default async function SeriesRedirectPage({ params }: SeriesRedirectPageProps) {
  const content = await getSlugById(params.id);

  if (!content) {
    notFound();
  }

  const target = content.type === 'MOVIE' ? `/film/${content.slug}` : `/dizi/${content.slug}`;
  redirect(target);
}
