'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { getLanguage, supportedLanguages } from '@/i18n';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
    const lang = getLanguage();
    const langConfig = supportedLanguages.find((l) => l.code === lang);
    if (langConfig) {
      document.documentElement.dir = langConfig.dir;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [fetchUser]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f1f1f',
            color: '#fff',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: { iconTheme: { primary: '#E50914', secondary: '#fff' } },
          error: { iconTheme: { primary: '#E50914', secondary: '#fff' } },
        }}
      />
      {children}
    </>
  );
}
