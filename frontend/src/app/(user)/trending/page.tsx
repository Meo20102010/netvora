'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { contentApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import ContentCard from '@/components/ContentCard';
import { HiArrowTrendingUp } from 'react-icons/hi2';

export default function TrendingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    const load = async () => {
      try {
        const res = await contentApi.getTrending();
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
          <HiArrowTrendingUp className="w-7 h-7 text-[#E50914]" />
          <h1 className="text-2xl md:text-3xl font-black">Gündemdekiler</h1>
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
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <HiArrowTrendingUp className="w-16 h-16 text-[#333] mx-auto mb-4" />
            <p className="text-[#555]">Henüz gündemde bir içerik bulunamadı.</p>
          </div>
        )}
      </main>
    </div>
  );
}
