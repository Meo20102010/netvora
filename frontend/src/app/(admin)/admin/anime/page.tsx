'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi, contentApi } from '@/lib/api';
import { Content, Category, Season, Episode } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiMagnifyingGlass, HiPlus, HiPencil, HiTrash, HiChevronLeft, HiChevronRight,
  HiXMark, HiChevronDown, HiChevronUp, HiPlay, HiStar,
  HiSquares2X2, HiListBullet, HiPhoto, HiCalendar,
  HiMagnifyingGlassCircle, HiExclamationTriangle, HiArrowDownTray,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminAnime() {
  const { t } = useTranslation();
  const [anime, setAnime] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const posterInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tmdbId, setTmdbId] = useState('');
  const [tmdbLoading, setTmdbLoading] = useState(false);

  const defaultForm = {
    title: '', type: 'ANIME', description: '', posterUrl: '', coverUrl: '', trailerUrl: '',
    year: new Date().getFullYear(), duration: 0, imdbRating: 0, director: '',
    cast: '', tags: '', country: '', language: 'Japonca', quality: 'HD',
    categoryId: '', isFeatured: false, videoUrl: '', publishAt: '',
  };
  const [form, setForm] = useState(defaultForm);

  const [episodeForm, setEpisodeForm] = useState({
    episodeNumber: 1, title: '', description: '', duration: 0, stillUrl: '', videoUrl: '',
  });

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [animeRes, catsRes] = await Promise.all([
        adminApi.getAnime({ page, limit: 20, search }),
        adminApi.getCategories(),
      ]);
      if (animeRes.data.success) {
        setAnime(animeRes.data.data);
        setTotalPages(animeRes.data.pagination?.totalPages || 1);
      }
      if (catsRes.data.success) setCategories(catsRes.data.data);
    } catch { toast.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const toggleExpand = async (contentId: string) => {
    if (expandedId === contentId) { setExpandedId(null); return; }
    setExpandedId(contentId);
    try {
      const res = await contentApi.getById(contentId);
      if (res.data.success) {
        setSeasons(res.data.data.seasons || []);
        setSelectedContentId(contentId);
      }
    } catch { toast.error(t('common.error')); }
  };

  const openCreate = () => { setForm(defaultForm); setEditId(null); setTmdbId(''); setShowDrawer(true); };
  const openEdit = (s: Content) => {
    setForm({
      title: s.title, type: 'ANIME', description: s.description || '',
      posterUrl: s.posterUrl || '', coverUrl: s.coverUrl || '', trailerUrl: s.trailerUrl || '',
      year: s.year || new Date().getFullYear(), duration: s.duration || 0,
      imdbRating: s.imdbRating || 0, director: s.director || '',
      cast: (s.cast || []).join(', '), tags: (s.tags || []).join(', '),
      country: s.country || '', language: s.language || 'Japonca', quality: s.quality,
      categoryId: s.categoryId || '', isFeatured: s.isFeatured,
      videoUrl: s.videos?.[0]?.url || '', publishAt: (s as any).publishAt || '',
    });
    setEditId(s.id); setTmdbId(''); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error(t('admin.title_required')); return; }
    const data = {
      ...form,
      cast: form.cast.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      duration: Number(form.duration),
      year: Number(form.year),
      publishAt: form.publishAt || undefined,
    };
    try {
      if (editId) {
        await adminApi.updateContent(editId, data);
        if (form.videoUrl) await adminApi.addVideo(editId, { url: form.videoUrl, quality: form.quality });
        toast.success(t('common.save'));
      } else {
        const res = await adminApi.createContent(data);
        if (res.data.success && form.videoUrl) {
          await adminApi.addVideo(res.data.data.id, { url: form.videoUrl, quality: form.quality });
        }
        toast.success(t('common.create'));
      }
      setShowDrawer(false); loadData();
    } catch { toast.error(t('common.error')); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await adminApi.deleteContent(deleteId); toast.success(t('common.delete')); setDeleteId(null); loadData(); }
    catch { toast.error(t('common.error')); }
  };

  const handleExport = async (format: string) => {
    try {
      const res = await adminApi.exportContent(format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `anime_export.${format}`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error(t('common.error')); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try { await adminApi.bulkDelete(selectedIds); toast.success(`${selectedIds.length} silindi`); setSelectedIds([]); loadData(); }
    catch { toast.error(t('common.error')); }
  };

  const handleTmdbLookup = async () => {
    if (!tmdbId.trim()) { toast.error(t('admin.tmdb_id_required')); return; }
    setTmdbLoading(true);
    try {
      const res = await adminApi.tmdbLookup(tmdbId, 'tv');
      if (res.data.success) {
        const meta = res.data.data;
        setForm(f => ({
          ...f,
          title: meta.title || meta.name || f.title,
          description: meta.description || meta.overview || f.description,
          posterUrl: meta.posterUrl || meta.poster_path || f.posterUrl,
          coverUrl: meta.coverUrl || meta.backdrop_path || f.coverUrl,
          year: meta.year || meta.first_air_date?.substring(0, 4) ? Number(meta.first_air_date?.substring(0, 4)) : f.year,
          imdbRating: meta.imdbRating || meta.vote_average || f.imdbRating,
          director: meta.director || f.director,
          cast: meta.cast ? (Array.isArray(meta.cast) ? meta.cast.join(', ') : meta.cast) : f.cast,
          tags: meta.tags ? (Array.isArray(meta.tags) ? meta.tags.join(', ') : meta.tags) : f.tags,
          country: meta.country || f.country,
          language: meta.language || f.language,
        }));
        toast.success(t('admin.metadata_fetched'));
      }
    } catch { toast.error(t('admin.tmdb_search_failed')); }
    finally { setTmdbLoading(false); }
  };

  const addSeason = async (contentId: string, seasonNum: number) => {
    try {
      await adminApi.createSeason(contentId, { seasonNumber: seasonNum, title: '' });
      toast.success(t('common.create'));
      toggleExpand(contentId);
    } catch { toast.error(t('common.error')); }
  };

  const addEpisode = async () => {
    try {
      await adminApi.createEpisode(selectedSeasonId, episodeForm);
      toast.success(t('common.create'));
      setShowEpisodeModal(false);
      toggleExpand(selectedContentId);
    } catch { toast.error(t('common.error')); }
  };

  const deleteEpisode = async (episodeId: string) => {
    try {
      await adminApi.deleteEpisode(episodeId);
      toast.success(t('common.delete'));
      toggleExpand(selectedContentId);
    } catch { toast.error(t('common.error')); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => prev.length === filteredAnime.length ? [] : filteredAnime.map(a => a.id));
  };

  const filteredAnime = anime.filter(a => {
    if (filterCategory && a.categoryId !== filterCategory) return false;
    if (filterYear && String(a.year) !== filterYear) return false;
    return true;
  });

  const years = Array.from(new Set(anime.map(a => a.year).filter(Boolean) as number[])).sort((a, b) => b - a);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Anime</h1>
          <p className="text-sm text-gray-500 mt-1">{anime.length} toplam anime</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> Anime Ekle
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text" placeholder="Anime ara..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), loadData())}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 transition-all"
          />
        </div>
        <button onClick={() => { setPage(1); loadData(); }} className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">
          {t('common.search')}
        </button>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiSquares2X2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiListBullet className="w-4 h-4" />
          </button>
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-[#E50914]/50">
          <option value="">Tum Kategoriler</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-[#E50914]/50">
          <option value="">Tum Yillar</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">
          <HiArrowDownTray className="w-4 h-4" /> CSV
        </button>
        <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">
          <HiArrowDownTray className="w-4 h-4" /> JSON
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-2'}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={viewMode === 'grid'
              ? 'bg-white/[0.03] rounded-2xl overflow-hidden animate-pulse'
              : 'flex items-center gap-4 bg-white/[0.03] rounded-xl p-3 animate-pulse'
            }>
              {viewMode === 'grid' ? (
                <><div className="aspect-[2/3] bg-white/[0.04]" /><div className="p-3 space-y-2"><div className="h-4 bg-white/[0.04] rounded w-3/4" /></div></>
              ) : (
                <><div className="w-12 h-16 bg-white/[0.04] rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-white/[0.04] rounded w-1/3" /></div></>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAnime.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiMagnifyingGlassCircle className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">Anime bulunamadi</h3>
          <p className="text-sm text-gray-600 mb-4">{search ? `"${search}" icin sonuc yok` : 'Henuz anime eklenmemis'}</p>
          {!search && <button onClick={openCreate} className="text-sm text-[#E50914] hover:underline">Ilk animeyi ekle</button>}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filteredAnime.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAnime.map(a => (
            <div key={a.id} className="group relative bg-white/[0.02] rounded-2xl overflow-hidden border border-white/[0.04] transition-all hover:shadow-xl hover:shadow-black/20 hover:border-white/[0.08]">
              <button onClick={() => toggleSelect(a.id)} className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(a.id) ? 'bg-[#E50914] border-[#E50914]' : 'border-white/20 bg-black/40 hover:border-white/40'}`}>
                {selectedIds.includes(a.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </button>

              <div className="relative aspect-[2/3] bg-white/[0.04] cursor-pointer" onClick={() => toggleExpand(a.id)}>
                {a.posterUrl ? (
                  <img src={a.posterUrl} alt={a.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><HiPhoto className="w-10 h-10 text-gray-700" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
                  <p className="text-xs text-gray-300 line-clamp-2 mb-2">{a.description || 'Aciklama yok'}</p>
                  <div className="flex gap-1.5">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-all backdrop-blur-sm">Duzenle</button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(a.id); }} className="py-1.5 px-3 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs transition-all backdrop-blur-sm"><HiTrash className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {a.imdbRating != null && a.imdbRating > 0 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                    <HiStar className="w-3 h-3 text-amber-400" /><span className="text-xs font-medium text-amber-400">{a.imdbRating}</span>
                  </div>
                )}
                <div className={`absolute bottom-2 left-2 w-2 h-2 rounded-full ${a.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>

              <div className="p-3">
                <h3 className="text-sm font-medium text-white truncate">{a.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><HiCalendar className="w-3 h-3" />{a.year}</span>
                  <span className="text-xs text-gray-600">|</span>
                  <span className="text-xs text-gray-500">{a.language}</span>
                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${a.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{a.isActive ? 'Aktif' : 'Pasif'}</span>
                </div>
              </div>

              {/* Expanded Season/Episode Panel */}
              {expandedId === a.id && (
                <div className="border-t border-white/[0.06] p-3 bg-black/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sezonlar & Bolumler</span>
                    <button onClick={() => addSeason(a.id, (seasons.length || 0) + 1)} className="text-[10px] text-[#E50914] hover:text-red-400 font-medium">+ Sezon</button>
                  </div>
                  {seasons.length === 0 ? (
                    <p className="text-xs text-gray-600 py-2">Henuz sezon yok</p>
                  ) : seasons.map((season: Season) => (
                    <div key={season.id} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300 font-medium">Sezon {season.seasonNumber}</span>
                        <button onClick={() => { setSelectedSeasonId(season.id); setSelectedContentId(a.id); setEpisodeForm({ episodeNumber: (season.episodes?.length || 0) + 1, title: '', description: '', duration: 0, stillUrl: '', videoUrl: '' }); setShowEpisodeModal(true); }} className="text-[10px] text-[#E50914] hover:text-red-400">+ Bolum</button>
                      </div>
                      <div className="space-y-1">
                        {season.episodes?.map((ep: Episode) => (
                          <div key={ep.id} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1.5 group/ep">
                            {ep.stillUrl ? <img src={ep.stillUrl} alt="" className="w-8 h-5 rounded object-cover" /> : <HiPlay className="w-3 h-3 text-gray-600 shrink-0" />}
                            <span className="text-[11px] text-gray-300 truncate flex-1">{ep.episodeNumber}. {ep.title}</span>
                            {ep.duration ? <span className="text-[10px] text-gray-600">{ep.duration}dk</span> : null}
                            <button onClick={() => deleteEpisode(ep.id)} className="opacity-0 group-hover/ep:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all"><HiTrash className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && filteredAnime.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-5 py-3 text-left w-10"><button onClick={toggleSelectAll}><div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.length === filteredAnime.length && filteredAnime.length > 0 ? 'bg-[#E50914] border-[#E50914]' : 'border-white/20 bg-white/5'}`}>{selectedIds.length === filteredAnime.length && filteredAnime.length > 0 && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}</div></button></th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Poster</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Baslik</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Yil</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">IMDB</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Kategori</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Durum</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Islemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredAnime.map(a => (
                  <tr key={a.id} className={`hover:bg-white/[0.02] transition-colors ${selectedIds.includes(a.id) ? 'bg-[#E50914]/[0.03]' : ''}`}>
                    <td className="px-5 py-3"><button onClick={() => toggleSelect(a.id)}><div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedIds.includes(a.id) ? 'bg-[#E50914] border-[#E50914]' : 'border-white/20 bg-white/5'}`}>{selectedIds.includes(a.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}</div></button></td>
                    <td className="px-5 py-3"><div className="w-10 h-14 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">{a.posterUrl ? <img src={a.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><HiPhoto className="w-4 h-4 text-gray-700" /></div>}</div></td>
                    <td className="px-5 py-3"><p className="text-sm font-medium text-white">{a.title}</p><p className="text-[11px] text-gray-600 truncate max-w-[200px]">{a.director || a.description || '-'}</p></td>
                    <td className="px-5 py-3 text-sm text-gray-400">{a.year}</td>
                    <td className="px-5 py-3">{a.imdbRating != null && a.imdbRating > 0 ? <span className="text-sm text-amber-400 flex items-center gap-1"><HiStar className="w-3.5 h-3.5" />{a.imdbRating}</span> : <span className="text-sm text-gray-600">-</span>}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{a.category?.name || '-'}</td>
                    <td className="px-5 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{a.isActive ? 'Aktif' : 'Pasif'}</span></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(a)} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><HiPencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteId(a.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><HiTrash className="w-4 h-4" /></button>
                        <button onClick={() => toggleExpand(a.id)} className="p-2 text-gray-500 hover:text-white transition-all">{expandedId === a.id ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-all"><HiChevronLeft className="w-5 h-5" /></button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{p}</button>;
            })}
          </div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-all"><HiChevronRight className="w-5 h-5" /></button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="flex items-center gap-4 px-6 py-3 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-xl">
            <span className="text-sm font-medium text-white whitespace-nowrap">{selectedIds.length} secildi</span>
            <div className="w-px h-6 bg-white/10" />
            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium transition-all">Toplu Sil</button>
            <button onClick={() => setSelectedIds([])} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm transition-all">Secimi Kaldir</button>
          </div>
        </div>
      )}

      {/* Slide-in Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editId ? 'Anime Duzenle' : 'Anime Ekle'}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"><HiXMark className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* TMDB Lookup */}
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-2 block font-medium">{t('admin.tmdb_lookup')}</label>
                <div className="flex gap-2">
                  <input className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder={t('admin.tmdb_id')} value={tmdbId} onChange={e => setTmdbId(e.target.value)} />
                  <button onClick={handleTmdbLookup} disabled={tmdbLoading} className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50">{tmdbLoading ? '...' : t('admin.fetch_metadata')}</button>
                </div>
              </div>

              {/* Poster + Title */}
              <div className="flex gap-4">
                <div className="w-32 shrink-0">
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Poster</label>
                  <div className="aspect-[2/3] rounded-xl bg-white/[0.03] border-2 border-dashed border-white/[0.06] overflow-hidden flex items-center justify-center cursor-pointer hover:border-[#E50914]/50 transition-all" onClick={() => posterInputRef.current?.click()}>
                    {form.posterUrl ? <img src={form.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="text-center p-2"><HiPhoto className="w-6 h-6 text-gray-700 mx-auto mb-1" /><span className="text-[10px] text-gray-700">Poster URL</span></div>}
                  </div>
                  <input ref={posterInputRef} type="hidden" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Baslik *</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" placeholder="Anime adi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Yil</label>
                      <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Sure (dk)</label>
                      <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Aciklama</label>
                <textarea className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 resize-none h-24" placeholder="Anime konusu..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* URLs */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Poster URL</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.posterUrl} onChange={e => setForm(f => ({ ...f, posterUrl: e.target.value }))} />
                  {form.posterUrl && <img src={form.posterUrl} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Kapak URL</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Video URL</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Fragman URL</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.trailerUrl} onChange={e => setForm(f => ({ ...f, trailerUrl: e.target.value }))} />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Yonetmen</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Yonetmen adi" value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Ulke</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Japonya" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Seslendirmenler</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Ad Soyad, Ad Soyad" value={form.cast} onChange={e => setForm(f => ({ ...f, cast: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Etiketler</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Aksiyon, Fantastik" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>

              {/* Selects */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Dil</label>
                  <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="Japonca">Japonca</option><option value="Turkce">Turkce</option><option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Kalite</label>
                  <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}>
                    <option value="SD">SD</option><option value="HD">HD</option><option value="FULL_HD">Full HD</option><option value="UHD_4K">4K</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Kategori</label>
                  <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Sec</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* IMDB + Featured */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">IMDB Puani</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" step="0.1" min="0" max="10" value={form.imdbRating} onChange={e => setForm(f => ({ ...f, imdbRating: Number(e.target.value) }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all border border-white/[0.04]">
                    <div className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${form.isFeatured ? 'bg-[#E50914]' : 'bg-white/10'}`} onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isFeatured ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-sm text-gray-300">One Cikan</span>
                  </label>
                </div>
              </div>

              {/* Schedule */}
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider block font-medium">Zamanli Yayin</label>
                  <div className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${form.publishAt ? 'bg-[#E50914]' : 'bg-white/10'}`} onClick={() => setForm(f => ({ ...f, publishAt: f.publishAt ? '' : new Date().toISOString().slice(0, 16) }))}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.publishAt ? 'left-5' : 'left-1'}`} />
                  </div>
                </div>
                {form.publishAt ? (
                  <input type="datetime-local" className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.publishAt} onChange={e => setForm(f => ({ ...f, publishAt: e.target.value }))} />
                ) : <p className="text-sm text-gray-500">Simdi yayinla</p>}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="sticky bottom-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-white/[0.06] flex gap-3">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">
                {editId ? t('common.update') : t('common.create')}
              </button>
              <button onClick={() => setShowDrawer(false)} className="px-6 py-2.5 bg-white/[0.03] border border-white/[0.06] text-gray-300 hover:bg-white/[0.06] rounded-xl text-sm transition-all">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center"><HiExclamationTriangle className="w-5 h-5 text-red-400" /></div>
              <h3 className="text-lg font-semibold text-white">Animeyi Sil</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">Bu animeyi silmek istediginize emin misiniz? Bu islem geri alinamaz.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">{t('common.delete')}</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl text-sm transition-all">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Episode Modal */}
      {showEpisodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEpisodeModal(false)}>
          <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Bolum Ekle</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bolum #</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={episodeForm.episodeNumber} onChange={e => setEpisodeForm(f => ({ ...f, episodeNumber: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sure (dk)</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={episodeForm.duration} onChange={e => setEpisodeForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Baslik</label>
                <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="Bolum basligi" value={episodeForm.title} onChange={e => setEpisodeForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Aciklama</label>
                <textarea className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 resize-none h-16" placeholder="Bolum aciklamasi" value={episodeForm.description} onChange={e => setEpisodeForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Gorsel URL</label>
                <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={episodeForm.stillUrl} onChange={e => setEpisodeForm(f => ({ ...f, stillUrl: e.target.value }))} />
                {episodeForm.stillUrl && <img src={episodeForm.stillUrl} alt="" className="mt-2 h-16 rounded object-cover" />}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Video URL</label>
                <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={episodeForm.videoUrl} onChange={e => setEpisodeForm(f => ({ ...f, videoUrl: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={addEpisode} className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all">{t('common.create')}</button>
              <button onClick={() => setShowEpisodeModal(false)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-lg text-sm transition-all">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes slide-up { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
