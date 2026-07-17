'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { userApi } from '@/lib/api';
import { PageTransition, GlassCard, Avatar, AnimatedCounter, Badge, Skeleton } from '@/components/ui';
import {
  HiArrowLeft, HiCog6Tooth, HiStar, HiClock, HiHeart,
  HiTrophy, HiEye,
} from 'react-icons/hi2';

interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  email: string;
  createdAt: string;
  watchedCount?: number;
  favoriteCount?: number;
  ratingCount?: number;
  watchHours?: number;
  achievements?: { id: string; name: string; icon: string; description: string }[];
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function ProfilesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/'); return; }
    loadProfile();
  }, [isAuthenticated, router]);

  const loadProfile = async () => {
    try {
      const res = await userApi.getProfile();
      if (res.data.success) setProfile(res.data.data);
    } catch (err) { console.error('Profile load error:', err); }
    setLoading(false);
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="pt-24 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
          <div className="flex items-center gap-6 mb-8">
            <Skeleton variant="circular" width="80px" height="80px" />
            <div className="space-y-2">
              <Skeleton variant="text" width="200px" height="24px" />
              <Skeleton variant="text" width="150px" height="16px" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} variant="card" height="100px" />))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} variant="card" height="80px" />))}
          </div>
        </div>
      </div>
    );
  }

  const profileData = profile || {
    id: user?.id || '', username: user?.username || 'User',
    displayName: user?.displayName || user?.username || 'User',
    avatar: user?.avatar || undefined, email: user?.email || '',
    createdAt: user?.createdAt || new Date().toISOString(),
    watchedCount: 0, favoriteCount: 0, ratingCount: 0, watchHours: 0, achievements: [],
  };

  const stats = [
    { icon: HiEye, value: profileData.watchedCount || 0, label: 'Izlenen', color: 'text-[#E50914]' },
    { icon: HiHeart, value: profileData.favoriteCount || 0, label: 'Favori', color: 'text-pink-500' },
    { icon: HiStar, value: profileData.ratingCount || 0, label: 'Puan', color: 'text-yellow-500' },
    { icon: HiClock, value: profileData.watchHours || 0, label: 'Saat', color: 'text-blue-500' },
  ];

  const achievements = profileData.achievements || [
    { id: '1', name: 'Ilk Adim', icon: '🎬', description: 'Ilk filmini izledin' },
    { id: '2', name: 'Tutkun', icon: '🔥', description: '7 gun ust uste izledin' },
    { id: '3', name: 'Koleksiyoncu', icon: '⭐', description: '10 favori ekledin' },
    { id: '4', name: 'Elestirmen', icon: '📝', description: '5 yorum yazdin' },
    { id: '5', name: 'Gece Kusu', icon: '🦉', description: 'Gece yarisi izledin' },
    { id: '6', name: 'Macera Arayici', icon: '🎯', description: '5 farkli tur izledin' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="pt-24 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
          <Link href="/browse" className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors mb-6 w-fit">
            <HiArrowLeft className="w-5 h-5" /> {t('common.back')}
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6 mb-10">
            <Avatar src={profileData.avatar} name={profileData.displayName || profileData.username} size="xl" ring />
            <div>
              <h1 className="text-2xl md:text-3xl font-black">{profileData.displayName || profileData.username}</h1>
              <p className="text-[#808080] text-sm mt-1">{profileData.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="success" dot size="sm">Aktif Uye</Badge>
                <Badge variant="default" size="sm">{new Date(profileData.createdAt).toLocaleDateString('tr-TR')} beri</Badge>
              </div>
            </div>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div key={i} variants={fadeUp}>
                  <GlassCard className="p-5 text-center">
                    <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                    <AnimatedCounter value={stat.value} className="text-2xl font-black block" />
                    <p className="text-[#808080] text-xs mt-1">{stat.label}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <HiTrophy className="w-5 h-5 text-[#E50914]" />
              <h2 className="text-lg font-bold">Basarilar</h2>
            </div>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((ach) => (
              <motion.div key={ach.id} variants={fadeUp}>
                <GlassCard className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-2xl">{ach.icon}</div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{ach.name}</h3>
                      <p className="text-xs text-[#808080] truncate">{ach.description}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10">
            <Link href="/account" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#b3b3b3] hover:text-white hover:bg-white/[0.08] transition-all text-sm font-medium">
              <HiCog6Tooth className="w-4 h-4" /> Hesap Ayarlari
            </Link>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}