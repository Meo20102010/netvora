'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { contentApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import ContentCard from '@/components/ContentCard';
import { HiFire, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export default function PopularPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await contentApi.getAll({ sortBy: 'imdbRating', limit: 50, page });
        if (res.data.success) {
          setItems(res.data.data || []);
          setTotalPages(res.data.pagination?.totalPages || 1);
          setTotalItems(res.data.pagination?.total || 0);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [isAuthenticated, router, page]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <HiFire className="w-7 h-7 text-[#E50914]" />
          <h1 className="text-2xl md:text-3xl font-black">Popüler İçerikler</h1>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse"><div className="aspect-[2/3] rounded-md bg-[#1f1f1f]" /></div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {items.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"><HiChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm text-gray-400">Sayfa {page} / {totalPages} ({totalItems} içerik)</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"><HiChevronRight className="w-5 h-5" /></button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <HiFire className="w-16 h-16 text-[#333] mx-auto mb-4" />
            <p className="text-[#555]">Henüz popüler içerik bulunamadı.</p>
          </div>
        )}
      </main>
    </div>
  );
}
