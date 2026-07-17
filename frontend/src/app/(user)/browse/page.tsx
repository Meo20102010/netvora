'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n';
import { contentApi, userApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import ContentRow from '@/components/ContentRow';
import { PageTransition, Skeleton, CardSkeleton } from '@/components/ui';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const rowFade = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function BrowsePage() {
  const { t } = useTranslation();

  const [featured, setFeatured] = useState<Content[]>([]);
  const [trending, setTrending] = useState<Content[]>([]);
  const [popularMovies, setPopularMovies] = useState<Content[]>([]);
  const [popularSeries, setPopularSeries] = useState<Content[]>([]);
  const [newReleases, setNewReleases] = useState<Content[]>([]);
  const [documentaries, setDocumentaries] = useState<Content[]>([]);
  const [animations, setAnimations] = useState<Content[]>([]);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [
          featuredRes,
          trendingRes,
          moviesRes,
          seriesRes,
          newRes,
          docRes,
          animRes,
          subRes,
        ] = await Promise.allSettled([
          contentApi.getFeatured(),
          contentApi.getTrending(),
          contentApi.getAll({ type: 'MOVIE', sortBy: 'imdbRating', limit: 20 }),
          contentApi.getAll({ type: 'SERIES', sortBy: 'popularity', limit: 20 }),
          contentApi.getAll({ sortBy: 'createdAt', limit: 20 }),
          contentApi.getAll({ type: 'DOCUMENTARY', limit: 20 }),
          contentApi.getAll({ type: 'ANIMATION', limit: 20 }),
          userApi.getSubscription(),
        ]);

        if (featuredRes.status === 'fulfilled') setFeatured(featuredRes.value.data.data || []);
        if (trendingRes.status === 'fulfilled') setTrending(trendingRes.value.data.data || []);
        if (moviesRes.status === 'fulfilled') setPopularMovies(moviesRes.value.data.data || []);
        if (seriesRes.status === 'fulfilled') setPopularSeries(seriesRes.value.data.data || []);
        if (newRes.status === 'fulfilled') setNewReleases(newRes.value.data.data || []);
        if (docRes.status === 'fulfilled') setDocumentaries(docRes.value.data.data || []);
        if (animRes.status === 'fulfilled') setAnimations(animRes.value.data.data || []);
        if (subRes.status === 'fulfilled') {
          const subData = subRes.value.data.data;
          setHasSubscription(subData?.status === 'ACTIVE');
        }
      } catch (err) {
        console.error('Browse load error:', err);
      }

      try {
        const cwRes = await userApi.getContinueWatching();
        if (cwRes.data.success) {
          setContinueWatching(cwRes.data.data || []);
        }
      } catch {
        // continue watching may fail silently
      }

      setInitialLoading(false);
    };

    loadAll();
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <main className="pt-20 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
          <Skeleton variant="rectangular" height="55vh" className="mb-8 rounded-xl -mt-20" />
          <div className="space-y-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton variant="text" width="200px" height="24px" className="mb-4" />
                <div className="flex gap-3 overflow-hidden">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <CardSkeleton key={j} className="flex-none w-40 md:w-48" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />

        <main className="pb-12">
          <HeroSection items={featured} />

          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {continueWatching.length > 0 && (
              <motion.div variants={rowFade}>
                <ContentRow
                  title={t('home.continue_watching')}
                  items={continueWatching}
                />
              </motion.div>
            )}

            <motion.div variants={rowFade}>
              <ContentRow
                title={t('home.trending')}
                items={trending}
                loading={initialLoading}
              />
            </motion.div>

            <motion.div variants={rowFade}>
              <ContentRow
                title={t('home.popular_movies') || 'Popüler Filmler'}
                items={popularMovies}
                loading={initialLoading}
                seeAllLink="/browse/movies"
              />
            </motion.div>

            <motion.div variants={rowFade}>
              <ContentRow
                title={t('home.popular_series') || 'Popüler Diziler'}
                items={popularSeries}
                loading={initialLoading}
                seeAllLink="/browse/series"
              />
            </motion.div>

            <motion.div variants={rowFade}>
              <ContentRow
                title={t('home.new_releases')}
                items={newReleases}
                loading={initialLoading}
              />
            </motion.div>

            <motion.div variants={rowFade}>
              <ContentRow
                title={t('home.documentaries') || 'Belgeseller'}
                items={documentaries}
                loading={initialLoading}
              />
            </motion.div>

            <motion.div variants={rowFade}>
              <ContentRow
                title={t('home.animations') || 'Animasyon'}
                items={animations}
                loading={initialLoading}
              />
            </motion.div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
