'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Notification } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiPlus, HiTrash, HiXMark, HiBell, HiCalendarDays, HiUser, HiMegaphone,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminNotifications() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', targetUsers: 'all' });

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await adminApi.getNotifications();
      if (res.data.success) setNotifications(Array.isArray(res.data.data) ? res.data.data : []);
    } catch { toast.error(t('admin.notifications_load_error')); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error(t('admin.title_message_required')); return; }
    try {
      const res = await adminApi.createNotification(form);
      if (res.data.success) {
        toast.success(t('admin.notification_created'));
        setShowDrawer(false);
        setForm({ title: '', message: '', targetUsers: 'all' });
        loadNotifications();
      }
    } catch { toast.error(t('admin.notification_create_failed')); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminApi.deleteNotification(id);
      if (res.data.success) { toast.success(t('admin.notification_deleted')); loadNotifications(); }
    } catch { toast.error(t('admin.action_failed')); }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.notification_management')}</h1>
          <p className="text-sm text-gray-600 mt-1">{notifications.length} {t('common.total')}</p>
        </div>
        <button onClick={() => setShowDrawer(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> {t('admin.new_notification')}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiBell className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_notifications_yet')}</h3>
          <p className="text-sm text-gray-600">{t('admin.send_first_notification')}</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-all">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/10 flex items-center justify-center shrink-0">
                  <HiMegaphone className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white mb-1">{notif.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{notif.message}</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                      <HiCalendarDays className="w-3.5 h-3.5" />
                      {formatDate(notif.createdAt)}
                    </span>
                    {notif.targetUsers && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-600">
                        <HiUser className="w-3.5 h-3.5" />
                        {notif.targetUsers === 'all' ? t('admin.all_users') : `${notif.targetUsers} ${t('admin.user_count_suffix')}`}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(notif.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0">
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{t('admin.new_notification')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.title')} *</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder={t('admin.notification_title_placeholder')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.message')} *</label>
                <textarea className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 resize-none h-32" placeholder={t('admin.notification_message_placeholder')} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.target_users')}</label>
                <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.targetUsers} onChange={e => setForm(f => ({ ...f, targetUsers: e.target.value }))}>
                  <option value="all">{t('admin.all_users')}</option>
                  <option value="premium">{t('admin.premium_users')}</option>
                  <option value="free">{t('admin.free_users')}</option>
                </select>
              </div>
            </div>

            <div className="sticky bottom-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-white/[0.06] flex gap-3">
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">{t('admin.send_notification')}</button>
              <button onClick={() => setShowDrawer(false)} className="px-6 py-2.5 bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:bg-white/[0.06] rounded-xl text-sm transition-all">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
