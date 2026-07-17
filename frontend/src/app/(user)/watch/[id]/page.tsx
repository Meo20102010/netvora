'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { contentApi, userApi } from '@/lib/api';
import { Content, Episode, Season } from '@/types';
import { proxyImageUrl, proxyVideoUrl } from '@/lib/proxy';
import VideoPlayer from '@/components/VideoPlayer';
import ContentCard from '@/components/ContentCard';
import {
  HiArrowLeft, HiChevronLeft, HiChevronRight,
  HiPlay, HiLockClosed, HiHeart, HiOutlineHeart,
  HiClock, HiOutlineClock, HiStar, HiChevronDown,
  HiChevronUp, HiCommandLine, HiXMark,
} from 'react-icons/hi2';

const QUALITY_LABELS: Record<string, string> = {
  UHD_4K: '4K',
  FULL_HD: '1080p',
  HD: '720p',
  SD: '480p',
};

export default function WatchPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const id = params.id as string;

  const episodeId = searchParams.get('episode');
  const seasonParam = searchParams.get('season');
  const initialProgress = searchParams.get('t') ? parseFloat(searchParams.get('t')!) : undefined;

  const [content, setContent] = useState<Content | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [recommendations, setRecommendations] = useState<Content[]>([]);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [showEpisodeInfo, setShowEpisodeInfo] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/'); return; }
    const load = async () => {
      try {
        const [contentRes, subRes, favRes, laterRes, recRes] = await Promise.allSettled([
          contentApi.getById(id),
          userApi.getSubscription(),
          userApi.getFavorites(),
          userApi.getWatchLater(),
          contentApi.getRecommendations(id),
        ]);

        if (contentRes.status === 'fulfilled') {
          const data = contentRes.value.data.data;
          if (!data) { router.replace('/browse'); return; }
          setContent(data);
          const episodes: Episode[] = [];
          if (data.seasons) data.seasons.forEach((s: Season) => { if (s.episodes) episodes.push(...s.episodes); });
          setAllEpisodes(episodes);
          if (episodeId && episodes.length > 0) {
            const idx = episodes.findIndex(e => e.id === episodeId);
            if (idx !== -1) { setCurrentEpisodeIndex(idx); setCurrentEpisode(episodes[idx]); }
            else { setCurrentEpisodeIndex(0); setCurrentEpisode(episodes[0]); }
          } else if (episodes.length > 0) { setCurrentEpisodeIndex(0); setCurrentEpisode(episodes[0]); }
        }
        if (subRes.status === 'fulfilled') setHasSubscription(subRes.value.data.data?.status === 'ACTIVE');
        if (favRes.status === 'fulfilled') {
          const favs = favRes.value.data.data || [];
          setIsFavorite(favs.some((f: any) => f.contentId === id || f.id === id));
        }
        if (laterRes.status === 'fulfilled') {
          const later = laterRes.value.data.data || [];
          setIsInWatchLater(later.some((l: any) => l.contentId === id || l.id === id));
        }
        if (recRes.status === 'fulfilled') setRecommendations(recRes.value.data.data || []);
      } catch { router.replace('/browse'); }
      setLoading(false);
    };
    load();
  }, [id, episodeId, isAuthenticated, router]);

  // Auto-scroll sidebar to current episode
  useEffect(() => {
    if (sidebarRef.current) {
      const active = sidebarRef.current.querySelector('[data-active="true"]');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentEpisode?.id]);

  const handleProgress = useCallback(async (progress: number) => {
    try { await userApi.saveWatchProgress({ contentId: id, episodeId: currentEpisode?.id, progress, seasonNumber: seasonParam ? parseInt(seasonParam) : undefined }); } catch {}
  }, [id, currentEpisode?.id, seasonParam]);

  const goToEpisode = useCallback((episode: Episode) => {
    setShowEpisodeInfo(false);
    const seasonNum = content?.seasons?.find(s => s.episodes?.some(e => e.id === episode.id))?.seasonNumber;
    const params = new URLSearchParams();
    params.set('episode', episode.id);
    if (seasonNum) params.set('season', String(seasonNum));
    router.push(`/watch/${id}?${params.toString()}`);
  }, [content?.seasons, id, router]);

  const handlePrev = useCallback(() => { if (currentEpisodeIndex > 0) goToEpisode(allEpisodes[currentEpisodeIndex - 1]); }, [currentEpisodeIndex, allEpisodes, goToEpisode]);
  const handleNext = useCallback(() => { if (currentEpisodeIndex < allEpisodes.length - 1) goToEpisode(allEpisodes[currentEpisodeIndex + 1]); }, [currentEpisodeIndex, allEpisodes, goToEpisode]);

  const toggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) { await userApi.removeFavorite(id); setIsFavorite(false); toast.success('Favorilerden çıkarıldı'); }
      else { await userApi.addFavorite(id); setIsFavorite(true); toast.success('Favorilere eklendi'); }
    } catch { toast.error('İşlem başarısız'); }
  }, [id, isFavorite]);

  const toggleWatchLater = useCallback(async () => {
    try {
      if (isInWatchLater) { await userApi.removeWatchLater(id); setIsInWatchLater(false); toast.success('İzleme listesinden çıkarıldı'); }
      else { await userApi.addWatchLater(id); setIsInWatchLater(true); toast.success('İzleme listesine eklendi'); }
    } catch { toast.error('İşlem başarısız'); }
  }, [id, isInWatchLater]);

  const handleRate = useCallback(async (score: number) => {
    try {
      if (userRating === score) { await userApi.removeRating(id); setUserRating(0); toast.success('Puan kaldırıldı'); }
      else { await userApi.rateContent(id, score); setUserRating(score); toast.success('Puan verildi'); }
    } catch { toast.error('Puanlama başarısız'); }
  }, [id, userRating]);

  // Use episode videos for series, content videos for movies
  const episodeVideos = currentEpisode?.videos?.length ? currentEpisode.videos : content?.videos || [];
  const videoSrc = proxyVideoUrl(episodeVideos?.[0]?.url) || '';
  const videoPoster = proxyImageUrl(currentEpisode?.stillUrl) || proxyImageUrl(content?.coverUrl) || proxyImageUrl(content?.posterUrl) || undefined;
  const hasActiveSub = hasSubscription === true;

  const qualities = useMemo(() => {
    const vids = currentEpisode?.videos?.length ? currentEpisode.videos : content?.videos || [];
    return vids.map((v, i) => ({
      label: QUALITY_LABELS[v.quality] || v.quality,
      value: `${i}`,
    }));
  }, [currentEpisode?.videos, content?.videos]);

  const hasNext = currentEpisodeIndex < allEpisodes.length - 1;
  const currentSeasonNum = content?.seasons?.find(s => s.episodes?.some(e => e.id === currentEpisode?.id))?.seasonNumber;

  // Group episodes by season for sidebar
  const episodesBySeason = useMemo(() => {
    const map = new Map<number, { season: Season; episodes: Episode[] }>();
    content?.seasons?.forEach(s => {
      if (s.episodes?.length) {
        map.set(s.seasonNumber, { season: s, episodes: s.episodes });
      }
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [content?.seasons]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 border-[3px] border-white/10 border-t-[#E50914] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-[3px] border-white/5 border-b-[#E50914] rounded-full animate-spin animation-delay-150" />
          </div>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Main video area */}
        <div className="relative flex-1 flex flex-col bg-black">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center gap-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <HiArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-white/80 min-w-0 flex-1">
              <span className="font-semibold truncate inline-block max-w-[200px] md:max-w-[400px] align-middle">{content.title}</span>
              {currentEpisode && (
                <><span className="mx-2">·</span>
                  <span className="whitespace-nowrap">S{currentSeasonNum || '?'}:E{currentEpisode.episodeNumber}</span>
                  <span className="mx-2 hidden md:inline">·</span>
                  <span className="hidden md:inline truncate max-w-[200px] align-middle">{currentEpisode.title}</span>
                </>
              )}
            </div>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="ml-auto text-white/50 hover:text-white/80 transition-colors p-1.5 rounded hover:bg-white/5"
              title="Klavye Kısayolları"
            >
              <HiCommandLine className="w-4 h-4" />
            </button>
          </div>

          {/* Keyboard shortcuts overlay */}
          {showShortcuts && (
            <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
              <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Klavye Kısayolları</h3>
                  <button onClick={() => setShowShortcuts(false)} className="text-white/40 hover:text-white/80 transition-colors">
                    <HiXMark className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Boşluk / K', 'Oynat / Duraklat'],
                    ['F', 'Tam Ekran'],
                    ['Esc', 'Tam Ekrandan Çık'],
                    ['← / →', '10sn Geri / İleri'],
                    ['↑ / ↓', 'Ses Artır / Azalt'],
                    ['M', 'Sesi Kapat'],
                    ['I', 'Introyu Geç'],
                    ['N', 'Sonraki Bölüm'],
                    [', / .', 'Hız Azalt / Artır'],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[#b3b3b3]">{desc}</span>
                      <kbd className="bg-white/10 px-2 py-0.5 rounded text-xs text-white font-mono">{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasActiveSub === false && (
            <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center gap-4">
              <HiLockClosed className="w-16 h-16 text-[#E50914]" />
              <h2 className="text-xl font-bold text-white">{t('subscription.no_subscription')}</h2>
              <p className="text-sm text-[#b3b3b3]">Bu içeriği izlemek için premium paket satın almalısınız.</p>
              <Link href="/subscription" className="bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-3 rounded font-bold text-sm transition-all hover:scale-105">{t('subscription.buy')}</Link>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center bg-black">
            {hasActiveSub !== false && (
              videoSrc ? (
                <VideoPlayer
                  src={videoSrc}
                  poster={videoPoster}
                  title={currentEpisode?.title || content.title}
                  onProgress={(progress) => handleProgress(progress)}
                  initialProgress={initialProgress}
                  nextEpisode={hasNext && currentEpisodeIndex < allEpisodes.length - 1 ? {
                    id: allEpisodes[currentEpisodeIndex + 1]?.id || '',
                    title: allEpisodes[currentEpisodeIndex + 1]?.title || '',
                    seasonNumber: currentSeasonNum || 1,
                    episodeNumber: allEpisodes[currentEpisodeIndex + 1]?.episodeNumber || 0,
                  } : null}
                  onEnded={hasNext ? handleNext : undefined}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <HiPlay className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-base text-[#555] font-medium mb-1">Video kaynağı bulunamadı</p>
                  <p className="text-sm text-[#404040]">Bu bölüm için henüz video eklenmemiş.</p>
                </div>
              )
            )}
          </div>

          {/* Episode navigation bar */}
          {currentEpisode && allEpisodes.length > 1 && (
            <div className="bg-[#141414] border-t border-white/5 px-4 py-3 flex items-center justify-between">
              <button onClick={handlePrev} disabled={currentEpisodeIndex <= 0} className={`flex items-center gap-2 text-sm font-medium transition-colors ${currentEpisodeIndex <= 0 ? 'text-[#555] cursor-not-allowed' : 'text-[#b3b3b3] hover:text-white'}`}>
                <HiChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">{t('watch.prev_episode')}</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#808080]">{currentEpisodeIndex + 1} / {allEpisodes.length}</span>
                {currentEpisode?.description && (
                  <button
                    onClick={() => setShowEpisodeInfo(!showEpisodeInfo)}
                    className="text-xs text-[#808080] hover:text-white transition-colors flex items-center gap-1"
                  >
                    {showEpisodeInfo ? <HiChevronUp className="w-3 h-3" /> : <HiChevronDown className="w-3 h-3" />}
                    Bilgi
                  </button>
                )}
              </div>
              <button onClick={handleNext} disabled={currentEpisodeIndex >= allEpisodes.length - 1} className={`flex items-center gap-2 text-sm font-medium transition-colors ${currentEpisodeIndex >= allEpisodes.length - 1 ? 'text-[#555] cursor-not-allowed' : 'text-[#b3b3b3] hover:text-white'}`}>
                <span className="hidden sm:inline">{t('watch.next_episode')}</span><HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Episode description dropdown */}
          {showEpisodeInfo && currentEpisode?.description && (
            <div className="bg-[#1a1a1a] border-t border-white/5 px-4 py-3 animate-slide-down">
              <p className="text-sm text-[#b3b3b3] leading-relaxed">{currentEpisode.description}</p>
            </div>
          )}
        </div>

        {/* Sidebar - Episode list for series */}
        {allEpisodes.length > 1 && (
          <div
            ref={sidebarRef}
            className={`w-full lg:w-80 xl:w-96 bg-[#141414] border-l border-white/5 overflow-y-auto transition-all duration-300 ${
              sidebarExpanded ? 'max-h-[50vh] lg:max-h-screen' : 'max-h-12 lg:max-h-screen'
            }`}
          >
            {/* Header */}
            <div
              className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#141414] z-10 cursor-pointer lg:cursor-default"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
            >
              <h3 className="text-sm font-semibold text-white">Bölümler</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#808080]">{allEpisodes.length} bölüm</span>
                <button className="lg:hidden text-white/40 hover:text-white/80 transition-colors" onClick={(e) => { e.stopPropagation(); setSidebarExpanded(!sidebarExpanded); }}>
                  {sidebarExpanded ? <HiChevronDown className="w-4 h-4" /> : <HiChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Episode list by season */}
            <div className={`p-2 space-y-3 ${sidebarExpanded ? '' : 'hidden lg:block'}`}>
              {episodesBySeason.map(([seasonNum, { season, episodes }]) => (
                <div key={seasonNum}>
                  {episodesBySeason.length > 1 && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-[#808080] uppercase tracking-wider">
                      Sezon {seasonNum}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {episodes.map(ep => {
                      const isActive = ep.id === currentEpisode?.id;
                      return (
                        <button
                          key={ep.id}
                          data-active={isActive}
                          onClick={() => goToEpisode(ep)}
                          className={`w-full text-left p-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-[#E50914]/10 text-white ring-1 ring-[#E50914]/30'
                              : 'text-[#b3b3b3] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-20 aspect-video rounded overflow-hidden shrink-0 relative ${
                              isActive ? 'ring-1 ring-[#E50914]/50' : 'bg-[#1f1f1f]'
                            }`}>
                              {ep.stillUrl ? (
                                <img src={proxyImageUrl(ep.stillUrl) || ''} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <HiPlay className="w-4 h-4 text-[#555]" />
                                </div>
                              )}
                              {isActive && (
                                <div className="absolute inset-0 bg-[#E50914]/20 flex items-center justify-center">
                                  <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                                    <HiPlay className="w-3 h-3 text-[#E50914] ml-0.5" />
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">
                                Bölüm {ep.episodeNumber}
                              </p>
                              <p className="text-xs truncate text-[#808080] mt-0.5">
                                {ep.title || 'Başlıksız Bölüm'}
                              </p>
                              {ep.duration && (
                                <p className="text-[10px] text-[#555] mt-0.5">
                                  <HiClock className="w-2.5 h-2.5 inline mr-0.5" />
                                  {ep.duration} dk
                                </p>
                              )}
                            </div>
                            <HiPlay className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                              isActive ? 'text-[#E50914] opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content info bar */}
      <div className="bg-[#141414] border-t border-white/5 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={toggleFavorite} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${isFavorite ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/5 text-[#b3b3b3] hover:bg-white/10 hover:text-white'}`}>
              {isFavorite ? <HiHeart className="w-4 h-4" /> : <HiOutlineHeart className="w-4 h-4" />}
              {isFavorite ? 'Favori' : 'Favorilere Ekle'}
            </button>
            <button onClick={toggleWatchLater} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all ${isInWatchLater ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/5 text-[#b3b3b3] hover:bg-white/10 hover:text-white'}`}>
              {isInWatchLater ? <HiClock className="w-4 h-4" /> : <HiOutlineClock className="w-4 h-4" />}
              {isInWatchLater ? 'Listede' : 'İzleme Listesi'}
            </button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-[#808080] mr-1">Puanla:</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
              <button key={star} onClick={() => handleRate(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                className={`text-sm transition-all duration-150 ${(hoverRating || userRating) >= star ? 'text-yellow-400 scale-110' : 'text-[#555] hover:text-yellow-400/50'}`}
              >
                <HiStar className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      {content.description && (
        <div className="bg-[#141414] border-t border-white/5 px-4 md:px-8 py-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-[#b3b3b3] leading-relaxed max-w-3xl">{content.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {content.director && <span className="text-xs text-[#808080]"><span className="text-white/60">Yönetmen:</span> {content.director}</span>}
              {content.cast && content.cast.length > 0 && (
                <span className="text-xs text-[#808080]"><span className="text-white/60">Oyuncular:</span> {content.cast.slice(0, 3).join(', ')}{content.cast.length > 3 && '...'}</span>
              )}
              {content.year && <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#808080]">{content.year}</span>}
              {content.duration && <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#808080]">{content.duration} dk</span>}
              {content.imdbRating && <span className="text-xs px-2 py-0.5 rounded bg-[#f5c518]/20 text-[#f5c518]">IMDb {content.imdbRating.toFixed(1)}</span>}
              {content.quality && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  content.quality === 'UHD_4K' ? 'bg-purple-500/20 text-purple-300' :
                  content.quality === 'FULL_HD' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-green-500/20 text-green-300'
                }`}>{content.quality === 'UHD_4K' ? '4K' : content.quality === 'FULL_HD' ? 'Full HD' : content.quality}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Similar Content */}
      {recommendations.length > 0 && (
        <div className="bg-[#141414] border-t border-white/5 px-4 md:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg font-bold text-white mb-4">Benzer İçerikler</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {recommendations.map(item => (
                <ContentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
