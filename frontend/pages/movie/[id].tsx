import { GetServerSideProps } from 'next';
import { getSlugById } from '@/lib/seo-fetch';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const id = params?.id as string;
  const content = await getSlugById(id);

  if (!content) {
    return { notFound: true };
  }

  const destination = content.type === 'SERIES' ? `/dizi/${content.slug}` : `/film/${content.slug}`;

  return {
    redirect: {
      destination,
      permanent: true, // 301
    },
  };
};

export default function MovieRedirectPage() {
  return null;
}
