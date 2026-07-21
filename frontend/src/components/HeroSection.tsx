'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/types';
import { useTranslation } from '@/i18n';
import { userApi } from '@/lib/api';
import { HiPlay, HiPlus, HiCheck, HiChevronLeft, HiChevronRight, HiStar, HiClock } from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface HeroSectionProps {
  items: Content[];
}

export default function HeroSection({ items }: HeroSectionProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [inList, setInList] = useState<Set<string>>(new Set());

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0 || isHovering) return;
    const interval = setInterval(goNext, 6000);
    return () => clearInterval(interval);
  }, [items.length, isHovering, goNext]);

  if (items.length === 0) return null;

  const item = items[current];
  const isInList = inList.has(item.id);

  const handleAddList = async () => {
    try {
      if (isInList) {
        await userApi.removeWatchLater(item.id);
        setInList(prev => { const n = new Set(prev); n.delete(item.id); return n; });
        toast.success(t('content.removed_from_list'));
      } else {
        await userApi.addWatchLater(item.id);
        setInList(prev => { const n = new Set(prev); n.add(item.id); return n; });
        toast.success(t('content.added_to_list'));
      }
    } catch {
      toast.error(t('content.error_generic'));
    }
  };

  return (
    <div
      className="relative hero-slider -mt-20"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background */}
      <div className="absolute inset-0 transition-opacity duration-700 ease-in-out">
        {item.coverUrl ? (
          <Image
            src={item.coverUrl}
            alt={item.title}
            fill
            unoptimized
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            unoptimized
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#141414]" />
        )}
      </div>

      {/* Gradient overlays */}
      <div className="hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#E50914]/5 via-transparent to-transparent" />

      {/* Nav arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
          >
            <HiChevronLeft className="w-5 h-5 md:w-7 md:h-7" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-14 md:h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 hover:scale-105 transition-all opacity-0 group-hover:opacity-100"
          >
            <HiChevronRight className="w-5 h-5 md:w-7 md:h-7" />
          </button>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-6 md:px-16">
        <div className="max-w-2xl animate-fade-in" key={item.id}>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight mb-4">
            {item.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-3 text-sm text-[#b3b3b3] mb-4">
            {item.year && <span className="text-white font-semibold">{item.year}</span>}
            {item.imdbRating && (
              <span className="flex items-center gap-1">
                <HiStar className="w-4 h-4 text-yellow-500" />
                <span className="text-white font-semibold">{item.imdbRating.toFixed(1)}</span>
              </span>
            )}
            {item.duration && (
              <span className="flex items-center gap-1">
                <HiClock className="w-4 h-4" />
                <span>{item.duration} dk</span>
              </span>
            )}
            {item.quality && (
              <span className="px-2 py-0.5 text-xs font-bold border border-white/20 rounded">
                {item.quality}
              </span>
            )}
            {item.language && (
              <span className="text-[#808080]">{item.language}</span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm md:text-base text-[#b3b3b3] leading-relaxed line-clamp-3 mb-6 max-w-xl">
            {item.description}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href={item.type === 'SERIES' ? `/dizi/${item.slug}` : `/film/${item.slug}`}
              className="flex items-center gap-2 bg-[#E50914] hover:bg-[#f40612] text-white px-6 py-3 md:px-8 md:py-3.5 rounded font-bold text-sm md:text-base transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#E50914]/30"
            >
              <HiPlay className="w-5 h-5" />
              {t('content.watch_now_short')}
            </Link>
            <button
              onClick={handleAddList}
              className={`flex items-center gap-2 backdrop-blur-sm px-5 py-3 md:px-7 md:py-3.5 rounded font-semibold text-sm md:text-base border transition-all hover:scale-105 ${
                isInList
                  ? 'bg-white/20 border-white/30 text-white'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              }`}
            >
              {isInList ? <HiCheck className="w-5 h-5" /> : <HiPlus className="w-5 h-5" />}
              {isInList ? t('content.in_my_list') : t('content.add_list')}
            </button>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-[#808080] border border-white/5">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`transition-all duration-300 rounded-full ${
                idx === current
                  ? 'w-6 h-1.5 bg-[#E50914]'
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
