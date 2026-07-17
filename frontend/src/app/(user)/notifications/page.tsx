'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/lib/api';
import { Notification } from '@/types';
import Navbar from '@/components/Navbar';
import { HiBell, HiBellAlert, HiBellSlash } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/'); return; }
    loadNotifications();
  }, [isAuthenticated, router]);

  const loadNotifications = async () => {
    try {
      const res = await userApi.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.meta?.unreadCount || 0);
      }
    } catch {}
    setLoading(false);
  };

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await userApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { toast.error('Okunamadı'); }
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-400';
      case 'success': return 'bg-green-400';
      case 'error': return 'bg-red-400';
      default: return 'bg-blue-400';
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <HiBell className="w-7 h-7 text-[#E50914]" />
            <h1 className="text-2xl md:text-3xl font-black">Bildirimler</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-[#E50914] text-white rounded-full">{unreadCount} yeni</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <HiBellSlash className="w-16 h-16 text-[#333] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#b3b3b3] mb-2">Bildirim bulunmuyor</h3>
            <p className="text-sm text-[#555]">Henüz bir bildiriminiz yok.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                className={`flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                  n.isRead ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${getTypeColor(n.type || 'info')}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${n.isRead ? 'text-[#b3b3b3]' : 'text-white font-semibold'}`}>{n.title}</h3>
                    <span className="text-xs text-[#555] shrink-0">{new Date(n.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <p className="text-xs text-[#808080] mt-1 line-clamp-2">{n.message}</p>
                  {n.link && (
                    <a href={n.link} className="text-xs text-[#E50914] hover:underline mt-1 inline-block">Detaylar</a>
                  )}
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#E50914] shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
