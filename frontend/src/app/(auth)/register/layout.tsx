import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Üye Ol - Netvora',
  description: 'Netvora\'ya ücretsiz üye olun. Sınırsız film, dizi ve belgesel izlemeye hemen başlayın.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://netvora-green.vercel.app/register' },
};
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
