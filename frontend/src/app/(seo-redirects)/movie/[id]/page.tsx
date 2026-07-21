import { redirect, notFound } from 'next/navigation';
import { getSlugById } from '@/lib/seo-fetch';

interface MovieRedirectPageProps {
  params: { id: string };
}

export default async function MovieRedirectPage({ params }: MovieRedirectPageProps) {
  const content = await getSlugById(params.id);

  if (!content) {
    notFound();
  }

  const target = content.type === 'SERIES' ? `/dizi/${content.slug}` : `/film/${content.slug}`;
  redirect(target);
}
