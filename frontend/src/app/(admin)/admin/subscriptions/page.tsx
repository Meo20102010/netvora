'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Subscription } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiMagnifyingGlass, HiPlus, HiChevronLeft, HiChevronRight, HiXMark,
  HiCreditCard, HiClock, HiCheckCircle, HiXCircle, HiCalendarDays,
  HiUser, HiCurrencyDollar,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminSubscriptions() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState({ userId: '', email: '', packageName: 'Premium', duration: 30 });

  useEffect(() => { loadSubscriptions(); }, [page]);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSubscriptions({ page, limit: 20, search });
      if (res.data.success) {
        setSubscriptions(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch { toast.error(t('admin.subscriptions_load_error')); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const res = await adminApi.activateSubscription(form.userId, { packageName: form.packageName, duration: form.duration });
      if (res.data.success) {
        toast.success(t('admin.subscription_created'));
        setShowDrawer(false);
        setForm({ userId: '', email: '', packageName: 'Premium', duration: 30 });
        loadSubscriptions();
      }
    } catch { toast.error(t('admin.subscription_create_failed')); }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-500/10 text-green-400 border border-green-500/20',
      EXPIRED: 'bg-red-500/10 text-red-400 border border-red-500/20',
      CANCELLED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    };
    return styles[status] || styles.ACTIVE;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return HiCheckCircle;
      case 'EXPIRED': return HiXCircle;
      default: return HiClock;
    }
  };

  const getStatusLabel = (status: string) => {
    return status === 'ACTIVE' ? t('subscription.active') : status === 'EXPIRED' ? t('subscription.expired') : t('common.cancel');
  };

  const getDaysLeft = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.subscription_management')}</h1>
          <p className="text-sm text-gray-600 mt-1">{subscriptions.length} {t('common.total')}</p>
        </div>
        <button onClick={() => setShowDrawer(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> {t('admin.create_subscription')}
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input type="text" placeholder={t('admin.search_by_email')} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && (setPage(1), loadSubscriptions())} className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 transition-all" />
        </div>
        <button onClick={() => { setPage(1); loadSubscriptions(); }} className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">{t('common.search')}</button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && subscriptions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiCreditCard className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.user_not_found')}</h3>
          <p className="text-sm text-gray-600">{t('admin.no_subscriptions_yet')}</p>
        </div>
      )}

      {!loading && subscriptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((sub) => {
            const StatusIcon = getStatusIcon(sub.status);
            const daysLeft = getDaysLeft(sub.endDate);
            const progress = sub.status === 'ACTIVE' ? Math.max(0, Math.min(100, (daysLeft / 30) * 100)) : 0;

            return (
              <div key={sub.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/10 flex items-center justify-center">
                      <HiCreditCard className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{(sub as any).user?.displayName || (sub as any).user?.username || (sub as any).user?.email || sub.userId.substring(0, 8)}</p>
                      <p className="text-[11px] text-gray-600">{sub.packageName}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${getStatusBadge(sub.status)}`}>
                    <StatusIcon className="w-3 h-3" />
                    {getStatusLabel(sub.status)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <HiCalendarDays className="w-3.5 h-3.5 text-gray-600" />
                    <span>{t('admin.start_date')}: {new Date(sub.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <HiCalendarDays className="w-3.5 h-3.5 text-gray-600" />
                    <span>{t('admin.end_date')}: {new Date(sub.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {sub.status === 'ACTIVE' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-gray-600">{daysLeft} {t('admin.days_left_suffix')}</span>
                      <span className="text-[11px] text-gray-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progress > 50 ? 'bg-green-500' : progress > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-all"><HiChevronLeft className="w-5 h-5" /></button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{p}</button>;
            })}
          </div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-all"><HiChevronRight className="w-5 h-5" /></button>
        </div>
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{t('admin.create_subscription')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.user_id')}</label>
                <div className="relative">
                  <HiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input className="w-full pl-10 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder={t('admin.user_id')} value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('auth.email')}</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder={t('admin.email_optional')} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.package')}</label>
                <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.packageName} onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))}>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.duration_days')}</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="sticky bottom-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-white/[0.06] flex gap-3">
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">{t('common.create')}</button>
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
