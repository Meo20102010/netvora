'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { contentApi } from '@/lib/api';
import { Content } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ContentCard from '@/components/ContentCard';
import {
  PageTransition, SearchInput, Tabs, Skeleton, CardSkeleton,
  EmptyState, GlassCard,
} from '@/components/ui';
import { HiMagnifyingGlass, HiXMark, HiClock, HiFire, HiMicrophone, HiSquares2X2, HiListBullet } from 'react-icons/hi2';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const TYPE_FILTERS = [
    { id: '', label: t('search.all') || 'All' },
    { id: 'MOVIE', label: t('search.movies') || 'Films' },
    { id: 'SERIES', label: t('search.series') || 'Series' },
    { id: 'ANIME', label: 'Anime' },
  ];
  const YEAR_FILTERS = [
    { value: '', label: 'All Years' }, { value: '2026', label: '2026' }, { value: '2025', label: '2025' },
    { value: '2024', label: '2024' }, { value: '2023', label: '2023' }, { value: '2022', label: '2022' },
    { value: '2021', label: '2021' }, { value: '2020', label: '2020' },
    { value: '2010-2019', label: '2010-2019' }, { value: '2000-2009', label: '2000-2009' },
    { value: 'older', label: 'Before 2000' },
  ];
  const RATING_FILTERS = [
    { value: '', label: 'All Ratings' }, { value: '9', label: '9+' }, { value: '8', label: '8+' },
    { value: '7', label: '7+' }, { value: '6', label: '6+' },
  ];

  const initialQuery = searchParams?.get('q') || '';
  const initialType = searchParams?.get('type') || '';
  const initialYear = searchParams?.get('year') || '';
  const initialRating = searchParams?.get('rating') || '';

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [ratingFilter, setRatingFilter] = useState(initialRating);
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [voiceListening, setVoiceListening] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('netvora_recent_searches');
    if (saved) { try { setRecentSearches(JSON.parse(saved)); } catch {} }
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query); }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem('netvora_recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  const performSearch = useCallback(async (q: string, type: string, year: string, rating: string) => {
    if (!q.trim() && !type && !year && !rating) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const params: any = {};
      if (q.trim()) params.q = q.trim();
      if (type) params.type = type;
      if (year) params.year = year;
      if (rating) params.imdb = rating;
      const res = await contentApi.search(params);
      if (res.data.success) setResults(res.data.data || []);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery, typeFilter, yearFilter, ratingFilter);
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (typeFilter) params.set('type', typeFilter);
    if (yearFilter) params.set('year', yearFilter);
    if (ratingFilter) params.set('rating', ratingFilter);
    const qs = params.toString();
    router.replace(qs ? `/search?${qs}` : '/search', { scroll: false });
  }, [debouncedQuery, typeFilter, yearFilter, ratingFilter, performSearch, router]);

  useEffect(() => {
    if (initialQuery && !loading) saveRecentSearch(initialQuery);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) { saveRecentSearch(query.trim()); setDebouncedQuery(query.trim()); }
  };

  const handleRecentClick = (q: string) => { setQuery(q); setDebouncedQuery(q); };
  const handleClear = () => {
    setQuery(''); setDebouncedQuery(''); setTypeFilter(''); setYearFilter('');
    setRatingFilter(''); setResults([]); setSearched(false); inputRef.current?.focus();
  };
  const clearRecent = () => { setRecentSearches([]); localStorage.removeItem('netvora_recent_searches'); };
  const removeRecent = (q: string) => {
    const updated = recentSearches.filter((s) => s !== q);
    setRecentSearches(updated);
    localStorage.setItem('netvora_recent_searches', JSON.stringify(updated));
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast?.error?.('Tarayıcınız sesli aramayı desteklemiyor');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setVoiceListening(false);
    };
    recognition.onerror = () => setVoiceListening(false);
    recognition.onend = () => setVoiceListening(false);

    setVoiceListening(true);
    recognition.start();
  };

  if (!isAuthenticated) { router.replace('/'); return null; }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <main className="pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto">
          {/* Search bar with expanding animation */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative max-w-2xl mx-auto mb-6"
          >
            <div className="relative">
              <HiMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#808080]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="w-full bg-white/[0.04] text-white text-lg pl-12 pr-24 py-4 rounded-xl border border-white/[0.08] focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 focus:bg-white/[0.06] transition-all placeholder:text-[#555] backdrop-blur-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* Voice search button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleVoiceSearch}
                  className={`p-2 rounded-lg transition-colors ${
                    voiceListening
                      ? 'bg-[#E50914]/20 text-[#E50914]'
                      : 'text-[#808080] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <HiMicrophone className="w-5 h-5" />
                </motion.button>
                {query && (
                  <button type="button" onClick={() => setQuery('')} className="p-2 text-[#808080] hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors">
                    <HiXMark className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.form>

          {/* Filter tabs and chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-4 mb-8"
          >
            {/* Type tabs */}
            <Tabs
              tabs={TYPE_FILTERS}
              activeTab={typeFilter}
              onChange={(id) => setTypeFilter(id)}
            />

            {/* Filter chips row */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
                className="bg-white/[0.04] text-white text-xs px-3 py-1.5 rounded-full border border-white/[0.08] focus:outline-none focus:border-[#E50914]/50 cursor-pointer transition-colors">
                {YEAR_FILTERS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
              </select>

              <span className="text-[#333]">|</span>

              <div className="flex items-center gap-1">
                {RATING_FILTERS.map((f) => (
                  <motion.button
                    key={f.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRatingFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      ratingFilter === f.value
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-white/[0.04] text-[#b3b3b3] hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </motion.button>
                ))}
              </div>

              {(query || typeFilter || yearFilter || ratingFilter) && (
                <>
                  <span className="text-[#333]">|</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClear}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[#808080] hover:text-white"
                  >
                    <HiXMark className="w-3 h-3" /> Temizle
                  </motion.button>
                </>
              )}

              {/* View mode toggle */}
              <span className="text-[#333]">|</span>
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-full p-0.5 border border-white/[0.06]">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'grid' ? 'bg-[#E50914] text-white' : 'text-[#808080] hover:text-white'
                  }`}
                >
                  <HiSquares2X2 className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'list' ? 'bg-[#E50914] text-white' : 'text-[#808080] hover:text-white'
                  }`}
                >
                  <HiListBullet className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Recent searches */}
          {!searched && recentSearches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm text-[#b3b3b3]">
                  <HiClock className="w-4 h-4" /> Son Aramalar
                </h3>
                <button onClick={clearRecent} className="text-xs text-[#555] hover:text-white">Temizle</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s, idx) => (
                  <motion.div
                    key={`${s}-${idx}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleRecentClick(s)}
                    className="flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] text-[#b3b3b3] px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer group border border-white/[0.04]"
                  >
                    <HiFire className="w-3 h-3 text-[#555]" />{s}
                    <button onClick={(e) => { e.stopPropagation(); removeRecent(s); }}
                      className="ml-1 text-[#555] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <HiXMark className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
              : 'space-y-3'
            }>
              {viewMode === 'grid'
                ? Array.from({ length: 12 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))
                : Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <Skeleton variant="rectangular" width="80px" height="60px" className="rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton variant="text" height="14px" className="w-1/3" />
                        <Skeleton variant="text" height="12px" className="w-2/3" />
                      </div>
                    </div>
                  ))
              }
            </div>
          ) : searched ? (
            results.length > 0 ? (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.04 } },
                }}
                className={viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                  : 'space-y-3'
                }
              >
                {results.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    {viewMode === 'grid' ? (
                      <ContentCard item={item} />
                    ) : (
                      <GlassCard className="p-3" hover>
                        <Link href={item.type === 'SERIES' ? `/series/${item.id}` : `/movie/${item.id}`}>
                          <div className="flex gap-3 items-center">
                            <div className="relative w-20 h-14 rounded overflow-hidden bg-[#1f1f1f] shrink-0">
                              {item.posterUrl ? (
                                <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-[#333]">{item.title?.[0]}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                              <div className="flex items-center gap-2 text-xs text-[#808080] mt-0.5">
                                {item.year && <span>{item.year}</span>}
                                {item.imdbRating && (
                                  <span className="text-yellow-500">★ {item.imdbRating}</span>
                                )}
                                <span className="capitalize">{item.type?.toLowerCase()}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </GlassCard>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <EmptyState
                icon={<HiMagnifyingGlass className="w-8 h-8" />}
                title={t('search.no_results')}
                description="Farklı bir arama terimi dene."
              />
            )
          ) : (
            <div className="text-center py-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <HiMagnifyingGlass className="w-20 h-20 text-[#222] mx-auto mb-4" />
                <p className="text-[#555] text-sm">Film, dizi, belgesel ve daha fazlasını ara...</p>
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
}
