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

const siteName = 'Netvora';
const title = 'Netvora - Premium Dizi ve Film Platformu';
const description = 'Netvora ile sınırsız film, dizi ve belgesel izleyin. Premium kalitede, reklamsız ve kesintisiz eğlence deneyimi. Hemen ücretsiz üye olun.';
const url = 'https://netvora-green.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  keywords: ['film izle', 'dizi izle', 'online film', 'premium yayın', 'netvora', 'bedava film', 'türkçe dizi', 'anime izle', 'belgesel', 'sinema'],
  authors: [{ name: 'Netvora' }],
  creator: 'Netvora',
  publisher: 'Netvora',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: url,
    languages: {
      'tr': url,
      'en': `${url}/en`,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    url,
    siteName,
    title,
    description,
    images: [
      {
        url: `${url}/icon.jpg`,
        width: 1200,
        height: 630,
        alt: 'Netvora',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [`${url}/icon.jpg`],
    creator: '@netvora',
  },
  icons: {
    icon: '/icon.jpg',
    shortcut: '/favicon.ico',
    apple: '/icon.jpg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteName,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'X-Robots-Tag': 'index, follow',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://img.fullhdfilmizlesene.nz" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.fullhdfilmizlesene.nz" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body className="bg-[#141414] text-white antialiased">
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
