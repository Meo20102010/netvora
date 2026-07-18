'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { contentApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import ContentCard from '@/components/ContentCard';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export default function AnimePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/'); return; }
  }, [isAuthenticated, router]);

  useEffect(() => {
    load();
  }, [isAuthenticated, sortBy, page]);

  const load = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await contentApi.getAll({ type: 'ANIME', sortBy, limit: 50, page });
      if (res.data.success) {
        setItems(res.data.data || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.pagination?.total || 0);
      }
    } catch {}
    setLoading(false);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/browse')} className="text-[#808080] hover:text-white transition-colors">
              <HiChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl md:text-3xl font-black">Animeler</h1>
            <span className="text-sm text-[#808080]">({totalItems})</span>
          </div>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="bg-[#1f1f1f] text-white text-sm px-3 py-2 rounded border border-white/10 focus:outline-none focus:border-[#E50914]">
            <option value="createdAt">En Yeni</option>
            <option value="imdbRating">IMDB Puani</option>
            <option value="title">Isim</option>
            <option value="year">Yil</option>
          </select>
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
              {items.map((item) => (<ContentCard key={item.id} item={item} />))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"><HiChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm text-gray-400">Sayfa {page} / {totalPages} ({totalItems} anime)</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"><HiChevronRight className="w-5 h-5" /></button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#555]">Henuz anime bulunmuyor.</p>
          </div>
        )}
      </main>
    </div>
  );
}
