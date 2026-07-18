'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { contentApi, userApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import ContentRow from '@/components/ContentRow';
import StarRating from '@/components/StarRating';
import AIRecommendations from '@/components/AIRecommendations';
import CommentSection from '@/components/CommentSection';
import {
  PageTransition, GlassCard, ParallaxSection, AnimatedCounter,
  Tabs, Skeleton, Badge, GradientButton,
} from '@/components/ui';
import {
  HiPlay, HiPlus, HiCheck, HiHeart, HiOutlineHeart,
  HiStar, HiClock, HiUserGroup, HiTag, HiArrowLeft,
  HiInformationCircle, HiChatBubbleLeftEllipsis, HiSparkles,
} from 'react-icons/hi2';

export default function MovieDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const id = params?.id as string;

  const [content, setContent] = useState<Content | null>(null);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [inList, setInList] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }

    const load = async () => {
      try {
        const [contentRes, recRes, subRes] = await Promise.allSettled([
          contentApi.getById(id),
          contentApi.getRecommendations(id),
          userApi.getSubscription(),
        ]);

        if (contentRes.status === 'fulfilled') {
          const data = contentRes.value.data.data;
          if (!data) {
            router.replace('/browse');
            return;
          }
          if (data.type !== 'MOVIE' && data.type !== 'ANIME') {
            const route = data.type === 'SERIES' ? 'series' : 'movie';
            router.replace(`/${route}/${data.id}`);
            return;
          }
          setContent(data);
          setAverageRating(data.averageRating || 0);
        }

        if (recRes.status === 'fulfilled') {
          const recs = (recRes.value.data.data || []).filter((r: Content) => r.id !== id);
          setRecommendations(recs);
        }

        if (subRes.status === 'fulfilled') {
          const subData = subRes.value.data.data;
          setHasSubscription(subData?.status === 'ACTIVE');
        }
      } catch (err) {
        console.error(err);
        router.replace('/browse');
      }
      try {
        const ratingRes = await userApi.getMyRatings();
        if (ratingRes.data.success && Array.isArray(ratingRes.data.data)) {
          const found = ratingRes.data.data.find((r: any) => r.contentId === id);
          if (found) setUserRating(found.score);
        }
      } catch {}
      setLoading(false);
    };

    load();
  }, [id, isAuthenticated, router]);

  const handleToggleList = async () => {
    try {
      if (inList) {
        await userApi.removeWatchLater(id);
        setInList(false);
        toast.success(t('content.remove_list'));
      } else {
        await userApi.addWatchLater(id);
        setInList(true);
        toast.success(t('content.add_list'));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await userApi.removeFavorite(id);
        setIsFavorite(false);
        toast.success('Favorilerden çıkarıldı');
      } else {
        await userApi.addFavorite(id);
        setIsFavorite(true);
        toast.success('Favorilere eklendi');
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="relative h-[50vh] md:h-[65vh] -mt-20">
          <Skeleton variant="rectangular" height="100%" className="rounded-none" />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-40 relative z-20">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-48 md:w-72 shrink-0 hidden md:block">
              <Skeleton variant="card" height="430px" className="rounded-lg" />
            </div>
            <div className="flex-1 pt-4 md:pt-20 space-y-4">
              <Skeleton variant="text" height="40px" className="w-2/3" />
              <Skeleton variant="text" height="20px" className="w-1/3" />
              <Skeleton variant="text" className="w-full" />
              <Skeleton variant="text" className="w-full" />
              <Skeleton variant="text" className="w-3/4" />
              <div className="flex gap-3 pt-4">
                <Skeleton variant="rectangular" height="44px" width="160px" className="rounded" />
                <Skeleton variant="rectangular" height="44px" width="140px" className="rounded" />
                <Skeleton variant="rectangular" height="44px" width="100px" className="rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) return null;

  const hasActiveSub = hasSubscription === true;

  const detailTabs = [
    { id: 'info', label: t('content.details') || 'Bilgi', icon: <HiInformationCircle className="w-4 h-4" /> },
    { id: 'reviews', label: t('social.comments') || 'Yorumlar', icon: <HiChatBubbleLeftEllipsis className="w-4 h-4" /> },
    { id: 'similar', label: t('home.recommended') || 'Öneriler', icon: <HiSparkles className="w-4 h-4" /> },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0a]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Movie',
              name: content.title,
              description: content.description,
              image: content.posterUrl,
              dateCreated: content.year?.toString(),
              aggregateRating: content.imdbRating ? {
                '@type': 'AggregateRating',
                ratingValue: content.imdbRating,
                bestRating: '10',
                worstRating: '0',
              } : undefined,
              genre: content.tags || [],
              director: content.director ? { '@type': 'Person', name: content.director } : undefined,
              actor: content.cast?.map((name: string) => ({ '@type': 'Person', name })) || [],
            }),
          }}
        />
        <Navbar />

        {/* Hero header with parallax */}
        <div className="relative h-[50vh] md:h-[65vh] -mt-20">
          <ParallaxSection intensity={8}>
            {content.coverUrl ? (
              <Image
                src={content.coverUrl}
                alt={content.title}
                fill
                unoptimized
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : content.posterUrl ? (
              <Image
                src={content.posterUrl}
                alt={content.title}
                fill
                unoptimized
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a]" />
            )}
          </ParallaxSection>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 backdrop-blur-[2px]" />

          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-16 z-10">
            <motion.button
              onClick={() => router.back()}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors mb-4"
            >
              <HiArrowLeft className="w-5 h-5" />
              <span className="text-sm">{t('common.back')}</span>
            </motion.button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-40 relative z-20">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-48 md:w-72 shrink-0 hidden md:block"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#1f1f1f] shadow-2xl ring-1 ring-white/[0.08]">
                {content.posterUrl ? (
                  <Image
                    src={content.posterUrl}
                    alt={content.title}
                    width={288}
                    height={432}
                    unoptimized
                    className="w-full h-full object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#333]">
                    {content.title?.[0] || '?'}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Details */}
            <div className="flex-1 pt-4 md:pt-20">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-5xl font-black mb-3"
              >
                {content.title}
              </motion.h1>

              {/* Meta */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center flex-wrap gap-3 text-sm mb-4"
              >
                {content.year && (
                  <span className="text-white font-semibold">{content.year}</span>
                )}
                {content.duration && (
                  <span className="flex items-center gap-1 text-[#b3b3b3]">
                    <HiClock className="w-4 h-4" />
                    {content.duration} dk
                  </span>
                )}
                {content.imdbRating && (
                  <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                    <HiStar className="w-4 h-4" />
                    <AnimatedCounter value={content.imdbRating} suffix="/10" className="inline" />
                  </span>
                )}
                {content.quality && (
                  <Badge variant="info" size="sm">{content.quality}</Badge>
                )}
                {content.language && (
                  <span className="text-[#808080]">{content.language}</span>
                )}
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[#b3b3b3] leading-relaxed mb-6 max-w-2xl"
              >
                {content.description}
              </motion.p>

              {/* Director */}
              {content.director && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="flex items-center gap-2 text-sm mb-3"
                >
                  <span className="text-[#808080]">{t('content.director')}:</span>
                  <span className="text-white">{content.director}</span>
                </motion.div>
              )}

              {/* Cast */}
              {content.cast && content.cast.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-6"
                >
                  <div className="text-sm text-[#808080] mb-2">{t('content.cast')}:</div>
                  <div className="flex flex-wrap gap-3">
                    {content.cast.map((actor, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#E50914]/20 flex items-center justify-center text-xs font-bold text-[#E50914]">
                          {actor.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-[#b3b3b3]">{actor}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tags */}
              {content.tags && content.tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
                  {content.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/search?tag=${encodeURIComponent(tag)}`}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/5 text-[#808080] border border-white/5 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <HiTag className="w-3 h-3" />
                      {tag}
                    </Link>
                  ))}
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center flex-wrap gap-3 mb-8"
              >
                <div className="relative">
                  {hasActiveSub ? (
                    <GradientButton
                      variant="primary"
                      size="lg"
                      icon={<HiPlay className="w-5 h-5" />}
                      onClick={() => {}}
                    >
                      <Link href={`/watch/${content.id}`} className="absolute inset-0 flex items-center justify-center gap-2">
                        <HiPlay className="w-5 h-5" />
                        {t('content.watch_now')}
                      </Link>
                    </GradientButton>
                  ) : (
                    <div className="group relative">
                      <GradientButton variant="primary" size="lg" disabled icon={<HiPlay className="w-5 h-5" />}>
                        {t('content.watch_now')}
                      </GradientButton>
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#1f1f1f] border border-white/10 rounded-lg p-4 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64">
                        <p className="text-sm text-[#b3b3b3] mb-2">{t('subscription.no_subscription')}</p>
                        <Link
                          href="/subscription"
                          className="block text-center bg-[#E50914] hover:bg-[#f40612] text-white px-4 py-2 rounded text-sm font-semibold transition-colors pointer-events-auto"
                        >
                          {t('subscription.buy')}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleList}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded font-semibold text-sm border transition-all ${
                    inList
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {inList ? <HiCheck className="w-5 h-5" /> : <HiPlus className="w-5 h-5" />}
                  {inList ? t('content.remove_list') : t('content.add_list')}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleFavorite}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded font-semibold text-sm border transition-all ${
                    isFavorite
                      ? 'bg-[#E50914]/20 border-[#E50914]/50 text-[#E50914]'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  {isFavorite ? <HiHeart className="w-5 h-5" /> : <HiOutlineHeart className="w-5 h-5" />}
                  {isFavorite ? 'Favorilerde' : 'Favori'}
                </motion.button>
              </motion.div>

              {/* Rating */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-6"
              >
                <p className="text-sm text-[#808080] mb-2">Puan Ver</p>
                <StarRating contentId={id} initialRating={userRating} averageRating={averageRating} />
              </motion.div>
            </div>
          </div>

          {/* Tabs section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-12"
          >
            <Tabs
              tabs={detailTabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              className="mb-6"
            />

            <AnimatePresence mode="wait">
              {activeTab === 'info' && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard hover={false} className="p-6">
                    <h3 className="text-lg font-bold mb-4">{content.title}</h3>
                    <p className="text-[#b3b3b3] leading-relaxed mb-6">{content.description}</p>

                    {content.cast && content.cast.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-[#808080] mb-3">{t('content.cast')}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {content.cast.map((actor, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                              <div className="w-10 h-10 rounded-full bg-[#E50914]/20 flex items-center justify-center text-sm font-bold text-[#E50914] shrink-0">
                                {actor.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm text-[#b3b3b3] truncate">{actor}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      {content.year && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-xs text-[#808080] block mb-1">Yıl</span>
                          <span className="text-sm font-semibold">{content.year}</span>
                        </div>
                      )}
                      {content.duration && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-xs text-[#808080] block mb-1">Süre</span>
                          <span className="text-sm font-semibold">{content.duration} dk</span>
                        </div>
                      )}
                      {content.quality && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-xs text-[#808080] block mb-1">Kalite</span>
                          <span className="text-sm font-semibold">{content.quality}</span>
                        </div>
                      )}
                      {content.language && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-xs text-[#808080] block mb-1">Dil</span>
                          <span className="text-sm font-semibold">{content.language}</span>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard hover={false} className="p-6">
                    <CommentSection contentId={id} currentUserId={user?.id} />
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'similar' && (
                <motion.div
                  key="similar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {recommendations.length > 0 && (
                    <ContentRow
                      title={t('home.recommended')}
                      items={recommendations}
                    />
                  )}
                  <div className="mt-8">
                    <AIRecommendations />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
