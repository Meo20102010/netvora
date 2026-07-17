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
  HiStar, HiClock, HiTag, HiArrowLeft, HiChevronDown,
  HiEye, HiEyeSlash, HiInformationCircle, HiChatBubbleLeftEllipsis,
  HiSparkles,
} from 'react-icons/hi2';

export default function SeriesDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const id = params.id as string;

  const [content, setContent] = useState<Content | null>(null);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [inList, setInList] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(0);
  const [showSeasons, setShowSeasons] = useState(true);
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
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
          if (data.type !== 'SERIES') {
            const route = data.type === 'MOVIE' ? 'movie' : 'movie';
            router.replace(`/${route}/${data.id}`);
            return;
          }
          setContent(data);
          if (data.seasons && data.seasons.length > 0) {
            setSelectedSeason(data.seasons[0].seasonNumber);
          }
        }

        if (recRes.status === 'fulfilled') {
          setRecommendations(recRes.value.data.data || []);
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
        const historyRes = await userApi.getWatchHistory();
        if (historyRes.data.success && Array.isArray(historyRes.data.data)) {
          const watched = new Set<string>();
          historyRes.data.data.forEach((entry: any) => {
            if (entry.contentId === id && entry.episodeId) {
              watched.add(entry.episodeId);
            }
          });
          setWatchedEpisodes(watched);
        }
      } catch {}
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

  const currentSeason = content?.seasons?.find(
    (s) => s.seasonNumber === selectedSeason
  );
  const episodes = currentSeason?.episodes || [];

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
            </div>
          </div>
          <div className="mt-12 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-lg bg-white/[0.02]">
                <Skeleton variant="rectangular" width="180px" height="100px" className="rounded" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton variant="text" height="14px" className="w-1/3" />
                  <Skeleton variant="text" height="12px" className="w-full" />
                  <Skeleton variant="text" height="12px" className="w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!content) return null;

  const hasActiveSub = hasSubscription === true;

  const detailTabs = [
    { id: 'info', label: t('content.details') || 'Bilgi', icon: <HiInformationCircle className="w-4 h-4" /> },
    { id: 'episodes', label: t('content.episodes') || 'Bölümler', icon: <HiEye className="w-4 h-4" /> },
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
              '@type': 'TVSeries',
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center flex-wrap gap-3 text-sm mb-4"
              >
                {content.year && (
                  <span className="text-white font-semibold">{content.year}</span>
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
                <span className="text-[#808080]">
                  {content.seasons?.length || 0} {t('content.seasons')}
                </span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-[#b3b3b3] leading-relaxed mb-6 max-w-2xl"
              >
                {content.description}
              </motion.p>

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
                      <Link href={`/watch/${content.id}?season=${selectedSeason}&episode=${episodes[0]?.id || ''}`} className="absolute inset-0 flex items-center justify-center gap-2">
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-6"
              >
                <p className="text-sm text-[#808080] mb-2">Puan Ver</p>
                <StarRating contentId={id} initialRating={userRating} averageRating={content?.averageRating} />
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {content.year && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-xs text-[#808080] block mb-1">Yıl</span>
                          <span className="text-sm font-semibold">{content.year}</span>
                        </div>
                      )}
                      {content.seasons && (
                        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-xs text-[#808080] block mb-1">Sezon</span>
                          <span className="text-sm font-semibold">{content.seasons.length}</span>
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

              {activeTab === 'episodes' && (
                <motion.div
                  key="episodes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {content.seasons && content.seasons.length > 0 && (
                    <div>
                      {/* Animated season chips */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {content.seasons.map((season) => (
                          <motion.button
                            key={season.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedSeason(season.seasonNumber)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedSeason === season.seasonNumber
                                ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/20'
                                : 'bg-white/[0.04] text-[#808080] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
                            }`}
                          >
                            {season.title || `${season.seasonNumber}. Sezon`}
                          </motion.button>
                        ))}
                      </div>

                      {/* Episode list */}
                      <div className="space-y-2">
                        {episodes.length > 0 ? (
                          <AnimatePresence mode="popLayout">
                            {episodes.map((episode, idx) => {
                              const isWatched = watchedEpisodes.has(episode.id);
                              return (
                                <motion.div
                                  key={episode.id}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                                  layout
                                >
                                  <Link
                                    href={`/watch/${content.id}?episode=${episode.id}&season=${selectedSeason}`}
                                    className="flex gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
                                  >
                                    {/* Still */}
                                    <div className="relative w-40 md:w-48 shrink-0 aspect-video rounded overflow-hidden bg-[#1f1f1f]">
                                      {episode.stillUrl ? (
                                        <Image
                                          src={episode.stillUrl}
                                          alt={episode.title}
                                          fill
                                          unoptimized
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                          sizes="160px"
                                        />
                                      ) : content.posterUrl ? (
                                        <>
                                          <Image
                                            src={content.posterUrl}
                                            alt=""
                                            fill
                                            unoptimized
                                            className="object-cover opacity-40 scale-150 blur-sm"
                                            sizes="160px"
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-black text-white/80 drop-shadow-lg">
                                              {episode.episodeNumber}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#333] text-xs">
                                          {episode.episodeNumber}
                                        </div>
                                      )}
                                      {/* Play overlay */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <motion.div
                                          whileHover={{ scale: 1.1 }}
                                          className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
                                        >
                                          <HiPlay className="w-6 h-6 text-white ml-0.5" />
                                        </motion.div>
                                      </div>
                                      {/* Progress */}
                                      {isWatched && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#E50914]" />
                                      )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-[#808080] shrink-0">
                                          {episode.episodeNumber}.
                                        </span>
                                        <h3 className="text-sm font-semibold text-white truncate">
                                          {episode.title}
                                        </h3>
                                        {isWatched && (
                                          <Badge variant="danger" size="sm">İzlendi</Badge>
                                        )}
                                      </div>
                                      {episode.description && (
                                        <p className="text-xs text-[#808080] line-clamp-2 mt-1">
                                          {episode.description}
                                        </p>
                                      )}
                                      {episode.duration && (
                                        <span className="text-xs text-[#555] mt-2 block">
                                          <HiClock className="w-3 h-3 inline mr-1" />
                                          {episode.duration} dk
                                        </span>
                                      )}
                                    </div>
                                  </Link>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        ) : (
                          <GlassCard hover={false} className="p-8 text-center">
                            <p className="text-[#808080] text-sm">
                              Bu sezonda bölüm bulunmuyor.
                            </p>
                          </GlassCard>
                        )}
                      </div>
                    </div>
                  )}
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
