'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import Link from 'next/link';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import ProgressBar from '@/components/ui/ProgressBar';
import PageTransition from '@/components/ui/PageTransition';
import { DashboardStats } from '@/types';
import {
  HiUsers, HiFilm, HiTv, HiEye,
  HiBanknotes, HiArrowTrendingUp, HiClock,
  HiArrowRight, HiFire, HiStar, HiCalendar,
  HiCpuChip, HiServerStack, HiCircleStack,
  HiBolt, HiGlobeAlt, HiExclamationTriangle,
  HiCog6Tooth, HiBell, HiPlus,
} from 'react-icons/hi2';

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
        <div className="w-24 h-8 bg-white/[0.04] rounded" />
      </div>
      <div className="w-24 h-3 bg-white/[0.06] rounded mb-2" />
      <div className="w-16 h-7 bg-white/[0.06] rounded" />
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [serverStats, setServerStats] = useState<any>(null);
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadDashboard = useCallback(async () => {
    try {
      const [dashRes, serverRes, rtRes] = await Promise.allSettled([
        adminApi.getDashboard(),
        fetch('/api/admin/stats/server', {
          headers: { Authorization: `Bearer ${document.cookie.match(/token=([^;]+)/)?.[1] || ''}` },
        }).then(r => r.json()),
        fetch('/api/admin/stats/realtime', {
          headers: { Authorization: `Bearer ${document.cookie.match(/token=([^;]+)/)?.[1] || ''}` },
        }).then(r => r.json()),
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value.data.success) {
        setStats(dashRes.value.data.data);
      }
      if (serverRes.status === 'fulfilled' && serverRes.value.success) {
        setServerStats(serverRes.value.data);
      }
      if (rtRes.status === 'fulfilled' && rtRes.value.success) {
        setRealtimeData(rtRes.value.data);
      }
      setLastRefresh(new Date());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const statCards = [
    { key: 'totalUsers', labelKey: 'admin.total_users', icon: HiUsers, color: '#3b82f6', bg: 'from-blue-500/10 to-blue-600/5', href: '/admin/users' },
    { key: 'onlineUsers', labelKey: 'admin.online_users', icon: HiGlobeAlt, color: '#22c55e', bg: 'from-green-500/10 to-green-600/5', href: '/admin/users', custom: true },
    { key: 'totalMovies', labelKey: 'admin.total_movies', icon: HiFilm, color: '#ef4444', bg: 'from-red-500/10 to-red-600/5', href: '/admin/movies' },
    { key: 'totalSeries', labelKey: 'admin.total_series', icon: HiTv, color: '#22c55e', bg: 'from-emerald-500/10 to-emerald-600/5', href: '/admin/series' },
    { key: 'totalRevenue', labelKey: 'admin.revenue', icon: HiBanknotes, color: '#a855f7', bg: 'from-purple-500/10 to-purple-600/5', href: '/admin/subscriptions' },
    { key: 'todayRevenue', labelKey: 'admin.today_revenue', icon: HiArrowTrendingUp, color: '#f97316', bg: 'from-orange-500/10 to-orange-600/5', href: '/admin/subscriptions' },
  ];

  const quickActions = [
    { labelKey: 'admin.new_movie', href: '/admin/movies', icon: HiFilm, color: 'text-red-400 bg-red-500/10 hover:bg-red-500/15' },
    { labelKey: 'admin.new_series', href: '/admin/series', icon: HiTv, color: 'text-green-400 bg-green-500/10 hover:bg-green-500/15' },
    { labelKey: 'admin.add_user', href: '/admin/users', icon: HiUsers, color: 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/15' },
    { labelKey: 'admin.send_notification_btn', href: '/admin/notifications', icon: HiBell, color: 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/15' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const contentTotal = (stats?.totalMovies || 0) + (stats?.totalSeries || 0);

  return (
    <PageTransition className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.dashboard')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('admin.platform_status')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600">
            {t('admin.realtime_dashboard')} {lastRefresh.toLocaleTimeString('tr-TR')}
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          let value: number;
          if (card.custom && realtimeData) {
            value = realtimeData.onlineUsers || 0;
          } else {
            value = stats ? (stats as any)[card.key] || 0 : 0;
          }
          const displayValue = card.key.includes('Revenue')
            ? formatCurrency(value)
            : null;

          return (
            <GlassCard key={card.key} delay={i * 0.05}>
              <Link href={card.href} className="block p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-all">
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 font-medium">{t(card.labelKey)}</p>
                <div className="flex items-end justify-between mt-1">
                  {displayValue ? (
                    <p className="text-2xl font-bold text-white tracking-tight">{displayValue}</p>
                  ) : (
                    <p className="text-2xl font-bold text-white tracking-tight">
                      <AnimatedCounter value={value} />
                    </p>
                  )}
                  <HiArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </GlassCard>
          );
        })}
      </div>

      {serverStats && (
        <GlassCard className="p-5" delay={0.1}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <HiServerStack className="w-4 h-4 text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">{t('admin.server_status')}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <HiCpuChip className="w-3.5 h-3.5" /> {t('admin.cpu_usage')}
                </span>
                <span className="text-xs font-medium text-white">{serverStats.cpu?.usage || 0}%</span>
              </div>
              <ProgressBar value={serverStats.cpu?.usage || 0} color="linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)" />
              <p className="text-[10px] text-gray-600 mt-1">{serverStats.cpu?.cores || 0} cores</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <HiCircleStack className="w-3.5 h-3.5" /> {t('admin.ram_usage')}
                </span>
                <span className="text-xs font-medium text-white">{serverStats.memory?.percentage || 0}%</span>
              </div>
              <ProgressBar value={serverStats.memory?.percentage || 0} color="linear-gradient(90deg, #22c55e 0%, #4ade80 100%)" />
              <p className="text-[10px] text-gray-600 mt-1">{formatBytes(serverStats.memory?.used)} / {formatBytes(serverStats.memory?.total)}</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                  <HiBolt className="w-3.5 h-3.5" /> {t('admin.disk_usage')}
                </span>
                <span className="text-xs font-medium text-white">{serverStats.disk?.percentage || 0}%</span>
              </div>
              <ProgressBar value={serverStats.disk?.percentage || 0} color="linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)" />
              <p className="text-[10px] text-gray-600 mt-1">{formatBytes(serverStats.disk?.used)} / {formatBytes(serverStats.disk?.total)}</p>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400">{t('admin.content_distribution')}</h3>
          <span className="text-xs text-gray-600">{contentTotal} {t('common.total')}</span>
        </div>
        <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-white/[0.03]">
          {stats && stats.totalMovies > 0 && (
            <div
              className="bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-700"
              style={{ width: `${contentTotal > 0 ? (stats.totalMovies / contentTotal) * 100 : 0}%` }}
            />
          )}
          {stats && stats.totalSeries > 0 && (
            <div
              className="bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
              style={{ width: `${contentTotal > 0 ? (stats.totalSeries / contentTotal) * 100 : 0}%` }}
            />
          )}
        </div>
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">{t('admin.movies')} ({stats?.totalMovies || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500">{t('admin.series')} ({stats?.totalSeries || 0})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <HiUsers className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('admin.recent_users')}</h3>
            </div>
            <Link href="/admin/users" className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1">
              {t('admin.view_all')} <HiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {stats?.recentUsers?.slice(0, 6).map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center">
                    <span className="text-xs font-semibold text-white">
                      {(user.displayName || user.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {user.role !== 'USER' && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E50914] border-2 border-[#0a0a0a] flex items-center justify-center">
                      <span className="text-[6px] text-white font-bold">A</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.displayName || user.username}</p>
                  <p className="text-[11px] text-gray-600 truncate">{user.email}</p>
                </div>
                <span className="text-[11px] text-gray-600 shrink-0">
                  {new Date(user.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
            {(!stats?.recentUsers || stats.recentUsers.length === 0) && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-600">{t('admin.no_members_yet')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-red-500/10">
                <HiFire className="w-4 h-4 text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">{t('admin.recent_content')}</h3>
            </div>
            <Link href="/admin/movies" className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1">
              {t('admin.view_all')} <HiArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {stats?.recentContent?.slice(0, 6).map((content) => (
              <div key={content.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
                  {content.posterUrl ? (
                    <img src={content.posterUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <HiFilm className="w-4 h-4 text-gray-700" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{content.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      content.type === 'MOVIE' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {content.type === 'MOVIE' ? t('content.type_movie') : t('content.type_series')}
                    </span>
                    {content.year && (
                      <span className="text-[11px] text-gray-600 flex items-center gap-0.5">
                        <HiCalendar className="w-3 h-3" />{content.year}
                      </span>
                    )}
                    {content.imdbRating ? (
                      <span className="text-[11px] text-amber-400 flex items-center gap-0.5">
                        <HiStar className="w-3 h-3" />{content.imdbRating}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-[11px] text-gray-600 shrink-0">
                  {new Date(content.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
            {(!stats?.recentContent || stats.recentContent.length === 0) && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-600">{t('admin.no_content_yet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {realtimeData?.recentActions && realtimeData.recentActions.length > 0 && (
        <GlassCard className="p-5" delay={0.2}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <HiClock className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">{t('admin.activity_feed')}</h3>
          </div>
          <div className="space-y-2">
            {realtimeData.recentActions.slice(0, 5).map((action: any, idx: number) => (
              <div key={action.id || idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300">
                    <span className="font-medium text-white">{action.user?.displayName || action.user?.username || 'System'}</span>
                    {' '}{action.action} on {action.resource}
                  </p>
                </div>
                <span className="text-[10px] text-gray-600 shrink-0">
                  {new Date(action.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5" delay={0.25}>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">{t('admin.quick_actions')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.labelKey}
              href={action.href}
              className={`flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.04] ${action.color} transition-all group`}
            >
              <action.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{t(action.labelKey)}</span>
            </Link>
          ))}
        </div>
      </GlassCard>
    </PageTransition>
  );
}
