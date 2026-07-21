import { redirect, notFound } from 'next/navigation';
import { getContentById } from '@/lib/seo-fetch';

interface MoviePageProps {
  params: { id: string };
}

export default async function MovieDetailPage({ params }: MoviePageProps) {
  const content = await getContentById(params.id);

  if (!content) {
    notFound();
  }

  const target = content.type === 'SERIES' ? `/dizi/${content.slug}` : `/film/${content.slug}`;
  redirect(target);
}
