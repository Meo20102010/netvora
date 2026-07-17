import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientProvider from './client-layout';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#E50914',
};

export const metadata: Metadata = {
  title: 'Netvora - Premium Dizi ve Film Platformu',
  description: 'Sınırsız film, dizi ve daha fazlası. Netvora ile premium eğlenceye hazır ol.',
  keywords: 'film, dizi, izle, online, premium, netvora',
  openGraph: { title: 'Netvora - Premium Dizi ve Film Platformu', description: 'Sınırsız film, dizi ve daha fazlası.', type: 'website' },
  icons: { icon: '/icon.jpg', shortcut: '/favicon.ico', apple: '/icon.jpg' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Netvora',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-[#141414] text-white antialiased">
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
