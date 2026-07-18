import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Giriş Yap - Netvora',
  description: 'Netvora hesabınıza giriş yapın. Film ve dizilerin keyfini çıkarmaya devam edin.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://netvora.com/login' },
};
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
