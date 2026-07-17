'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Content } from '@/types';
import ContentCard from './ContentCard';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

interface ContentRowProps {
  title: string;
  items: Content[];
  loading?: boolean;
  seeAllLink?: string;
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-none w-40 md:w-48 lg:w-52 animate-pulse">
          <div className="aspect-[2/3] rounded-md bg-[#1f1f1f]" />
        </div>
      ))}
    </div>
  );
}

export default function ContentRow({ title, items, loading, seeAllLink }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const scroll = (dir: 'left' | 'right') => {
    if (!rowRef.current) return;
    const amount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const handleScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  return (
    <section className="px-4 md:px-12 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">{title}</h2>
        {seeAllLink && (
          <Link
            href={seeAllLink}
            className="text-sm text-[#b3b3b3] hover:text-white transition-colors"
          >
            Tümünü Gör
          </Link>
        )}
      </div>

      <div className="relative group">
        {/* Left arrow */}
        {showLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-[#141414]/90 to-transparent flex items-center justify-start opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <HiChevronLeft className="w-8 h-8 text-white" />
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={rowRef}
          onScroll={handleScroll}
          className="flex gap-2 overflow-x-auto py-2 scrollbar-hide content-row"
        >
          {loading ? (
            <LoadingSkeleton />
          ) : items.length > 0 ? (
            items.map((item) => <ContentCard key={item.id} item={item} />)
          ) : (
            <p className="text-[#808080] text-sm py-8">Henüz içerik bulunmuyor.</p>
          )}
        </div>

        {/* Right arrow */}
        {showRight && items.length > 0 && !loading && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[#141414]/90 to-transparent flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <HiChevronRight className="w-8 h-8 text-white" />
          </button>
        )}
      </div>
    </section>
  );
}
