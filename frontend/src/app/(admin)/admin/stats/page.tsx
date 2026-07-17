'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import {
  HiChartBar, HiArrowPath, HiEye, HiUsers, HiMagnifyingGlass, HiFire,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface StatsData {
  overview?: { totalUsers: number; totalContent: number; activeSubscriptions: number; totalWatchHistory: number };
  mostWatchedContent?: { content?: { id: string; title: string }; watchCount: number }[];
  mostActiveUsers?: { user?: { id: string; username: string }; watchCount: number }[];
  topSearches?: any[];
  popularGenres?: { category: string; count: number }[];
}

export default function AdminStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDetailedStats();
      if (res.data.success) {
        setStats(res.data.data || null);
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const mostWatched = stats?.mostWatchedContent || [];
  const activeUsers = stats?.mostActiveUsers || [];
  const searches = stats?.topSearches || [];
  const genres = stats?.popularGenres || [];

  const isEmpty = mostWatched.length === 0 && activeUsers.length === 0 && searches.length === 0 && genres.length === 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.detailed_stats')}</h1>
          {stats?.overview && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{stats.overview.totalUsers} {t('admin.total_users')}</span>
              <span>{stats.overview.totalContent} {t('admin.movies')}</span>
              <span>{stats.overview.activeSubscriptions} {t('admin.active_subscriptions')}</span>
              <span>{stats.overview.totalWatchHistory} {t('admin.views_count')}</span>
            </div>
          )}
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all"
        >
          <HiArrowPath className="w-4 h-4" /> {t('common.actions')}
        </button>
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <div className="p-4 rounded-full bg-[#E50914]/10 mb-4">
            <HiChartBar className="w-12 h-12 text-[#E50914]" />
          </div>
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_errors')}</h3>
          <p className="text-sm text-gray-600">{t('admin.detailed_stats')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Watched Content */}
        {mostWatched.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.04]">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <HiEye className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('admin.most_watched')}</h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {mostWatched.map((item, idx) => {
                const maxViews = Math.max(...mostWatched.map(m => m.watchCount), 1);
                return (
                  <div key={item.content?.id || idx} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-500 w-6">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.content?.title || 'Unknown'}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {item.watchCount} {t('admin.views_count')}
                      </span>
                    </div>
                    <div className="ml-9 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#E50914] to-[#E50914]/60 transition-all duration-500"
                        style={{ width: `${(item.watchCount / maxViews) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Most Active Users */}
        {activeUsers.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.04]">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <HiUsers className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('admin.most_active_users')}</h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {activeUsers.map((item, idx) => {
                const maxCount = Math.max(...activeUsers.map(m => m.watchCount), 1);
                return (
                  <div key={item.user?.id || idx} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-500 w-6">#{idx + 1}</span>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/[0.06] flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">{(item.user?.username || 'U')[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.user?.username || 'Unknown'}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {item.watchCount} {t('admin.views_count')}
                      </span>
                    </div>
                    <div className="ml-9 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400/60 transition-all duration-500"
                        style={{ width: `${(item.watchCount / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Searches */}
        {searches.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.04]">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <HiMagnifyingGlass className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('admin.top_searches')}</h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {searches.slice(0, 10).map((item: any, idx: number) => (
                <div key={idx} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 w-6">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.detail || item.action || 'Search'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Genres */}
        {genres.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.04]">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <HiFire className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('admin.popular_genres')}</h3>
            </div>
            <div className="divide-y divide-white/[0.03]">
              {genres.map((item, idx) => {
                const maxCount = Math.max(...genres.map(g => g.count), 1);
                return (
                  <div key={idx} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-500 w-6">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.category}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{item.count}</span>
                    </div>
                    <div className="ml-9 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400/60 transition-all duration-500"
                        style={{ width: `${(item.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
