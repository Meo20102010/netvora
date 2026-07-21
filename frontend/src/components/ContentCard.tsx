'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/types';
import { useTranslation } from '@/i18n';
import { HiPlay, HiStar } from 'react-icons/hi2';

interface ContentCardProps {
  item: Content;
}

export default function ContentCard({ item }: ContentCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const typeLabels: Record<string, string> = {
    MOVIE: t('content.type_movie'), SERIES: t('content.type_series'),
    DOCUMENTARY: t('content.type_documentary'), ANIMATION: t('content.type_animation'),
    STANDUP: t('content.type_standup'), ORIGINAL: t('content.type_original'),
    ANIME: t('content.type_anime') || 'Anime',
  };
  const href = item.type === 'SERIES' ? `/dizi/${item.slug}` : `/film/${item.slug}`;

  return (
    <Link href={href} className="group flex-none w-40 md:w-48 lg:w-52 relative">
      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-[#1f1f1f] relative shadow-lg shadow-black/20 ring-1 ring-white/5 group-hover:ring-[#E50914]/30 transition-all duration-300">
        {item.posterUrl && !imgError ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 160px, (max-width: 1024px) 192px, 208px"
            className="object-cover transition-all duration-500 group-hover:scale-110"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]">
            <span className="text-4xl font-black text-[#444] drop-shadow-lg">
              {item.title?.[0] || '?'}
            </span>
          </div>
        )}

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quality badge */}
        {item.quality && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-bold bg-black/70 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {item.quality}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          <span className="text-xs font-semibold text-[#E50914] mb-1 drop-shadow">
            {typeLabels[item.type] || item.type}
          </span>
          <h3 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2 drop-shadow">
            {item.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-[#b3b3b3] mb-2">
            {item.year && <span>{item.year}</span>}
            {item.imdbRating && (
              <span className="flex items-center gap-1">
                <HiStar className="w-3 h-3 text-yellow-500" />
                {item.imdbRating.toFixed(1)}
              </span>
            )}
            {item.duration && <span>{item.duration}{t('content.min_short')}</span>}
          </div>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#E50914] hover:bg-[#f40612] px-3 py-1.5 rounded transition-all duration-200 w-fit shadow-lg shadow-[#E50914]/30">
            <HiPlay className="w-3 h-3" />
            {t('content.watch_now_short')}
          </span>
        </div>
      </div>
    </Link>
  );
}
