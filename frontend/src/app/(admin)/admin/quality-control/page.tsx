'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { QualityIssue } from '@/types';
import { useTranslation } from '@/i18n';
import Link from 'next/link';
import {
  HiCheckBadge, HiPhoto, HiFilm,
  HiArrowPath, HiLink, HiLanguage,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

type IssueGroup = {
  type: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  items: QualityIssue[];
};

export default function AdminQualityControl() {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAudit(); }, []);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await adminApi.qualityAudit();
      if (res.data.success) {
        setIssues(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch {
      toast.error(t('common.error'));
    }
    finally { setLoading(false); }
  };

  const groupedIssues: IssueGroup[] = [
    {
      type: 'missing_poster',
      label: t('admin.missing_poster'),
      icon: HiPhoto,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      items: issues.filter(i => i.type === 'missing_poster'),
    },
    {
      type: 'missing_episodes',
      label: t('admin.missing_episodes'),
      icon: HiFilm,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      items: issues.filter(i => i.type === 'missing_episodes'),
    },
    {
      type: 'broken_video',
      label: t('admin.broken_video'),
      icon: HiLink,
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      items: issues.filter(i => i.type === 'broken_video'),
    },
    {
      type: 'missing_subtitle',
      label: t('admin.missing_subtitle'),
      icon: HiLanguage,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      items: issues.filter(i => i.type === 'missing_subtitle'),
    },
  ];

  const activeGroups = groupedIssues.filter(g => g.items.length > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.quality_control')}</h1>
          <p className="text-sm text-gray-600 mt-1">{issues.length} {t('admin.issues_found')}</p>
        </div>
        <button
          onClick={loadAudit}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all"
        >
          <HiArrowPath className="w-4 h-4" /> {t('common.actions')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {groupedIssues.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.type} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl border ${group.bg}`}>
                  <Icon className={`w-5 h-5 ${group.color}`} />
                </div>
              </div>
              <p className="text-[13px] text-gray-500 font-medium">{group.label}</p>
              <p className="text-2xl font-bold text-white tracking-tight mt-1">{group.items.length}</p>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {issues.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <div className="p-4 rounded-full bg-green-500/10 mb-4">
            <HiCheckBadge className="w-12 h-12 text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_errors')}</h3>
          <p className="text-sm text-gray-600">{t('admin.quality_control')}</p>
        </div>
      )}

      {/* Issue Groups */}
      {activeGroups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.type} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${group.bg}`}>
                  <Icon className={`w-4 h-4 ${group.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                <span className="text-[11px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full">{group.items.length}</span>
              </div>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {group.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="p-2 rounded-lg bg-white/[0.04]">
                    <Icon className={`w-4 h-4 ${group.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-600 truncate">{item.details}</p>
                  </div>
                  <Link
                    href={`/admin/movies?edit=${item.contentId}`}
                    className="px-3 py-1.5 bg-[#E50914] hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all"
                  >
                    {t('common.edit')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
