'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiSparkles, HiArrowRight, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import { useTranslation } from '@/i18n';
import api from '@/lib/api';
import { Content } from '@/types';
import Link from 'next/link';

interface Recommendation {
  content: Content;
  score: number;
  reason: string;
  type: string;
}

interface AIRecommendationsProps {
  userId?: string;
}

export default function AIRecommendations({ userId }: AIRecommendationsProps) {
  const { t } = useTranslation();
  const [dailyPick, setDailyPick] = useState<Recommendation | null>(null);
  const [personalized, setPersonalized] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      const [dailyRes, recsRes] = await Promise.all([
        api.get('/ai/what-to-watch'),
        userId ? api.get(`/ai/recommendations/${userId}`) : Promise.resolve({ data: { data: [] } }),
      ]);
      setDailyPick(dailyRes.data.data?.dailyPick || null);
      setPersonalized(recsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const MatchBadge = ({ score }: { score: number }) => (
    <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
      %{Math.round(score)}
    </div>
  );

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 bg-zinc-700 rounded animate-pulse" />
          <div className="h-5 bg-zinc-700 rounded w-48 animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <div className="aspect-[2/3] bg-zinc-800 rounded-lg animate-pulse mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-3/4 animate-pulse mb-1" />
              <div className="h-2 bg-zinc-800 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const ContentCard = ({ rec, index }: { rec: Recommendation; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex-shrink-0 w-44 group"
    >
      <Link href={`/watch/${rec.content.slug}`}>
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
          {rec.content.posterUrl ? (
            <img
              src={rec.content.posterUrl}
              alt={rec.content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 text-2xl">
              {rec.content.title[0]}
            </div>
          )}
          <MatchBadge score={rec.score} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
      <h4 className="text-white text-sm font-medium truncate">{rec.content.title}</h4>
      <p className="text-zinc-500 text-xs truncate">{rec.reason}</p>
    </motion.div>
  );

  return (
    <div className="py-4 space-y-8">
      {dailyPick && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-xl overflow-hidden bg-gradient-to-r from-blue-900/40 via-zinc-900 to-purple-900/40 border border-zinc-800"
        >
          <div className="flex flex-col md:flex-row">
            {dailyPick.content.posterUrl && (
              <div className="md:w-48 h-64 md:h-auto flex-shrink-0">
                <img
                  src={dailyPick.content.posterUrl}
                  alt={dailyPick.content.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 flex flex-col justify-center flex-1">
              <div className="flex items-center gap-2 mb-2">
                <HiSparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-semibold">{t('ai.what_to_watch')}</span>
              </div>
              <h3 className="text-white text-2xl font-bold mb-2">{dailyPick.content.title}</h3>
              <p className="text-zinc-400 text-sm mb-1">{dailyPick.reason}</p>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4">
                {dailyPick.content.year && <span>{dailyPick.content.year}</span>}
                {dailyPick.content.imdbRating && <span>IMDB {dailyPick.content.imdbRating}</span>}
                {dailyPick.content.duration && <span>{dailyPick.content.duration} {t('content.min_short')}</span>}
                <span className="text-green-400 font-semibold">%{Math.round(dailyPick.score)} {t('ai.match_score')}</span>
              </div>
              <Link
                href={`/watch/${dailyPick.content.slug}`}
                className="inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg font-medium text-sm hover:bg-zinc-200 transition w-fit"
              >
                {t('content.watch_now')} <HiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {personalized.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HiSparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-white text-lg font-semibold">{t('ai.for_you')}</h3>
            </div>
            <div className="flex gap-1">
              <button onClick={() => scroll('left')} className="p-1.5 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                <HiChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => scroll('right')} className="p-1.5 bg-zinc-800 rounded-full hover:bg-zinc-700 transition">
                <HiChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {personalized.slice(0, 15).map((rec, i) => (
              <ContentCard key={rec.content.id} rec={rec} index={i} />
            ))}
          </div>
          <p className="text-zinc-600 text-xs mt-1">{t('ai.based_on_history')}</p>
        </section>
      )}
    </div>
  );
}
