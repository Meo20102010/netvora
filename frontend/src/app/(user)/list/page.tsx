'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { userApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import ContentCard from '@/components/ContentCard';
import {
  HiBookmark, HiHeart, HiClock, HiTrash,
  HiOutlineBookmark, HiOutlineHeart, HiOutlineClock,
  HiPlay,
} from 'react-icons/hi2';

type TabType = 'list' | 'favorites' | 'history';

const TABS: { key: TabType; labelKey: string }[] = [
  { key: 'list', labelKey: 'nav.my_list' },
  { key: 'favorites', labelKey: 'Favoriler' },
  { key: 'history', labelKey: 'İzleme Geçmişi' },
];

export default function ListPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [listItems, setListItems] = useState<Content[]>([]);
  const [favorites, setFavorites] = useState<Content[]>([]);
  const [history, setHistory] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    loadAll();
  }, [isAuthenticated, router]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [listRes, favRes, historyRes] = await Promise.allSettled([
        userApi.getWatchLater(),
        userApi.getFavorites(),
        userApi.getWatchHistory(),
      ]);

      if (listRes.status === 'fulfilled' && listRes.value.data.success) {
        setListItems(listRes.value.data.data || []);
      }
      if (favRes.status === 'fulfilled' && favRes.value.data.success) {
        setFavorites(favRes.value.data.data || []);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.data.success) {
        setHistory(historyRes.value.data.data || []);
      }
    } catch {
      toast.error(t('common.error'));
    }
    setLoading(false);
  };

  const handleRemove = useCallback(
    async (contentId: string) => {
      if (removingId === contentId) {
        try {
          await userApi.removeWatchLater(contentId);
          setListItems((prev) => prev.filter((item) => item.id !== contentId));
          toast.success(t('content.remove_list'));
          setRemovingId(null);
        } catch {
          toast.error(t('common.error'));
        }
      } else {
        setRemovingId(contentId);
        setTimeout(() => setRemovingId(null), 3000);
      }
    },
    [removingId, t]
  );

  const handleRemoveFavorite = useCallback(
    async (contentId: string) => {
      try {
        await userApi.removeFavorite(contentId);
        setFavorites((prev) => prev.filter((item) => item.id !== contentId));
        toast.success('Favorilerden çıkarıldı');
      } catch {
        toast.error(t('common.error'));
      }
    },
    []
  );

  const handleRemoveHistory = useCallback(
    async (contentId: string) => {
      try {
        await userApi.saveWatchProgress({ contentId, progress: 0, remove: true });
        setHistory((prev) => prev.filter((item: any) => item.id !== contentId));
        toast.success('Geçmişten kaldırıldı');
      } catch {
        toast.error(t('common.error'));
      }
    },
    []
  );

  const renderEmpty = (tab: TabType) => {
    const messages: Record<TabType, { icon: any; title: string; desc: string }> = {
      list: {
        icon: HiOutlineBookmark,
        title: 'Listem boş',
        desc: 'İzlemek istediğin içerikleri listene ekle.',
      },
      favorites: {
        icon: HiOutlineHeart,
        title: 'Favori listen boş',
        desc: 'Beğendiğin içerikleri favorilerine ekle.',
      },
      history: {
        icon: HiOutlineClock,
        title: 'İzleme geçmişin boş',
        desc: 'İzlediğin içerikler burada görünecek.',
      },
    };
    const msg = messages[tab];
    return (
      <div className="text-center py-20">
        <msg.icon className="w-16 h-16 text-[#333] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#b3b3b3] mb-2">{msg.title}</h3>
        <p className="text-sm text-[#555] mb-6">{msg.desc}</p>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#f40612] text-white px-6 py-2.5 rounded font-semibold text-sm transition-all"
        >
          <HiPlay className="w-4 h-4" />
          İçerikleri Keşfet
        </Link>
      </div>
    );
  };

  const renderContent = (items: Content[], tab: TabType) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] rounded-md bg-[#1f1f1f]" />
            </div>
          ))}
        </div>
      );
    }

    if (items.length === 0) return renderEmpty(tab);

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.id} className="group relative">
            <ContentCard item={item} />
            {/* Remove button overlay */}
            {tab === 'list' && (
              <button
                onClick={() => handleRemove(item.id)}
                className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
                  removingId === item.id
                    ? 'bg-[#E50914] text-white scale-110'
                    : 'bg-black/60 text-white hover:bg-[#E50914]'
                }`}
              >
                <HiTrash className="w-3.5 h-3.5" />
              </button>
            )}
            {tab === 'favorites' && (
              <button
                onClick={() => handleRemoveFavorite(item.id)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 text-[#E50914] opacity-0 group-hover:opacity-100 hover:bg-[#E50914] hover:text-white transition-all"
              >
                <HiHeart className="w-3.5 h-3.5" />
              </button>
            )}
            {tab === 'history' && (
              <button
                onClick={() => handleRemoveHistory(item.id)}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-[#E50914] transition-all"
              >
                <HiTrash className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />

      <main className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black mb-8">
          {activeTab === 'list' ? t('nav.my_list') : activeTab === 'favorites' ? 'Favoriler' : 'İzleme Geçmişi'}
        </h1>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-white/5 pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  isActive
                    ? 'text-white border-[#E50914]'
                    : 'text-[#808080] border-transparent hover:text-white hover:border-white/20'
                }`}
              >
                {tab.key === 'list' && (isActive ? <HiBookmark className="w-4 h-4" /> : <HiOutlineBookmark className="w-4 h-4" />)}
                {tab.key === 'favorites' && (isActive ? <HiHeart className="w-4 h-4" /> : <HiOutlineHeart className="w-4 h-4" />)}
                {tab.key === 'history' && (isActive ? <HiClock className="w-4 h-4" /> : <HiOutlineClock className="w-4 h-4" />)}
                {tab.labelKey}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'list' && renderContent(listItems, 'list')}
        {activeTab === 'favorites' && renderContent(favorites, 'favorites')}
        {activeTab === 'history' && renderContent(history, 'history')}
      </main>
    </div>
  );
}
