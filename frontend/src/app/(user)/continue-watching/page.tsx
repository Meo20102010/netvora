'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import ContentCard from '@/components/ContentCard';
import { HiPlay, HiClock } from 'react-icons/hi2';

interface ContinueWatchingItem extends Content {
  progress?: number;
}

export default function ContinueWatchingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    const load = async () => {
      try {
        const res = await userApi.getContinueWatching();
        if (res.data.success) setItems(res.data.data || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <HiClock className="w-7 h-7 text-[#E50914]" />
          <h1 className="text-2xl md:text-3xl font-black">İzlemeye Devam Et</h1>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse"><div className="aspect-[2/3] rounded-md bg-[#1f1f1f]" /></div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <ContentCard item={item} />
                {item.progress != null && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#333] rounded-b-md overflow-hidden">
                    <div
                      className="h-full bg-[#E50914] transition-all"
                      style={{ width: `${Math.min(item.progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <HiClock className="w-16 h-16 text-[#333] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#b3b3b3] mb-2">İzlemeye devam edeceğin içerik yok</h3>
            <p className="text-sm text-[#555] mb-6">Bir içerik izlemeye başladığında burada görünecek.</p>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#f40612] text-white px-6 py-2.5 rounded font-semibold text-sm transition-all"
            >
              <HiPlay className="w-4 h-4" />
              İçerikleri Keşfet
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
