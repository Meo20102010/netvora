'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { contents: number };
}

export default function BrowsePage() {
  const [featured, setFeatured] = useState<Content[]>([]);
  const [trending, setTrending] = useState<Content[]>([]);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryContent, setCategoryContent] = useState<Record<string, Content[]>>({});
  const [animeItems, setAnimeItems] = useState<Content[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [
          featuredRes,
          trendingRes,
          catsRes,
          animeRes,
        ] = await Promise.allSettled([
          contentApi.getFeatured(),
          contentApi.getTrending(),
          contentApi.getCategories(),
          contentApi.getAll({ type: 'ANIME', limit: 20 }),
        ]);

        if (featuredRes.status === 'fulfilled') setFeatured(featuredRes.value.data.data || []);
        if (trendingRes.status === 'fulfilled') setTrending(trendingRes.value.data.data || []);
        if (animeRes.status === 'fulfilled') setAnimeItems(animeRes.value.data.data || []);

        let cats: Category[] = [];
        if (catsRes.status === 'fulfilled') {
          cats = catsRes.value.data.data || [];
          setCategories(cats);
        }

        // Fetch content for each category in parallel
        if (cats.length > 0) {
          const catResults = await Promise.allSettled(
            cats.map(cat =>
              contentApi.getAll({ categoryId: cat.id, limit: 20 })
                .then(res => ({ id: cat.id, data: res.data.data || [] }))
            )
          );
          const map: Record<string, Content[]> = {};
          catResults.forEach(r => {
            if (r.status === 'fulfilled') map[r.value.id] = r.value.data;
          });
          setCategoryContent(map);
        }

        try {
          const subRes = await userApi.getSubscription();
          // subscription handled silently
        } catch {}
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
                  title="İzlemeye Devam Et"
                  items={continueWatching}
                />
              </motion.div>
            )}

            <motion.div variants={rowFade}>
              <ContentRow
                title="Gündemdekiler"
                items={trending}
                loading={initialLoading}
              />
            </motion.div>

            {categories.map(cat => {
              const items = categoryContent[cat.id] || [];
              return (
                <motion.div key={cat.id} variants={rowFade}>
                  <ContentRow
                    title={cat.name}
                    items={items}
                    loading={initialLoading}
                    seeAllLink={`/browse/category/${cat.slug}`}
                  />
                </motion.div>
              );
            })}

            {animeItems.length > 0 && (
              <motion.div variants={rowFade}>
                <ContentRow
                  title="Animeler"
                  items={animeItems}
                  loading={initialLoading}
                  seeAllLink="/browse/anime"
                />
              </motion.div>
            )}

            {categories.length === 0 && (
              <>
                <motion.div variants={rowFade}>
                  <ContentRow
                    title="Filmler"
                    items={[]}
                    loading={initialLoading}
                  />
                </motion.div>
                <motion.div variants={rowFade}>
                  <ContentRow
                    title="Diziler"
                    items={[]}
                    loading={initialLoading}
                  />
                </motion.div>
                <motion.div variants={rowFade}>
                  <ContentRow
                    title="Animeler"
                    items={[]}
                    loading={initialLoading}
                  />
                </motion.div>
              </>
            )}
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
