'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { ErrorLog } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiExclamationTriangle, HiArrowPath, HiExclamationCircle,
  HiCheckCircle, HiShieldExclamation, HiServerStack,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

type ErrorFilter = 'all' | 'broken_video' | 'failed_login' | 'server_error';

export default function AdminErrors() {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ErrorFilter>('all');

  useEffect(() => { loadErrors(); }, []);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getErrorLogs();
      if (res.data.success) {
        const d = res.data.data;
        setErrors(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.errors) ? d.errors : []);
      }
    } catch {
      toast.error(t('common.error'));
    }
    finally { setLoading(false); }
  };

  const filteredErrors = filter === 'all' ? errors : errors.filter(e => {
    if (filter === 'broken_video') return e.type === 'broken_video';
    if (filter === 'failed_login') return e.type === 'failed_login';
    if (filter === 'server_error') return e.type === 'server_error';
    return true;
  });

  const brokenVideos = errors.filter(e => e.type === 'broken_video').length;
  const failedLogins = errors.filter(e => e.type === 'failed_login').length;
  const serverErrors = errors.filter(e => e.type === 'server_error').length;

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'broken_video':
        return { icon: HiExclamationTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: t('admin.broken_videos') };
      case 'failed_login':
        return { icon: HiShieldExclamation, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: t('admin.failed_logins') };
      case 'server_error':
        return { icon: HiServerStack, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', label: t('admin.server_errors') };
      default:
        return { icon: HiExclamationCircle, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', label: type };
    }
  };

  const summaryCards = [
    { key: 'broken_video', label: t('admin.broken_videos'), count: brokenVideos, icon: HiExclamationTriangle, color: 'text-red-400', bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/20' },
    { key: 'failed_login', label: t('admin.failed_logins'), count: failedLogins, icon: HiShieldExclamation, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/20' },
    { key: 'server_error', label: t('admin.server_errors'), count: serverErrors, icon: HiServerStack, color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/20' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.error_monitoring')}</h1>
          <p className="text-sm text-gray-600 mt-1">{errors.length} {t('admin.issues_found')}</p>
        </div>
        <button
          onClick={loadErrors}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all"
        >
          <HiArrowPath className="w-4 h-4" /> {t('common.actions')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={`rounded-2xl bg-gradient-to-br ${card.bg} border ${card.border} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-white/[0.04]">
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-[13px] text-gray-500 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-white tracking-tight mt-1">{card.count}</p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {([
          { key: 'all', label: t('admin.select_all') },
          { key: 'broken_video', label: t('admin.broken_videos') },
          { key: 'failed_login', label: t('admin.failed_logins') },
          { key: 'server_error', label: t('admin.server_errors') },
        ] as { key: ErrorFilter; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f.key ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredErrors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <div className="p-4 rounded-full bg-green-500/10 mb-4">
            <HiCheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_errors')}</h3>
          <p className="text-sm text-gray-600">{t('admin.error_monitoring')}</p>
        </div>
      )}

      {/* Error Log List */}
      {filteredErrors.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="divide-y divide-white/[0.03]">
            {filteredErrors.map((error) => {
              const config = getTypeConfig(error.type);
              const TypeIcon = config.icon;
              return (
                <div key={error.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg border ${config.bg} mt-0.5`}>
                      <TypeIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-[11px] text-gray-600">
                          {new Date(error.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-white mt-1">{error.message}</p>
                      {error.details && (
                        <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{error.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
