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

export default function AdminSeries() {
  const { t } = useTranslation();
  const [series, setSeries] = useState<Content[]>([]);
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
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tmdbId, setTmdbId] = useState('');

  const defaultForm = {
    title: '', type: 'SERIES', description: '', posterUrl: '', coverUrl: '', trailerUrl: '',
    year: new Date().getFullYear(), imdbRating: 0, director: '',
    cast: '', tags: '', country: '', language: 'Türkçe', quality: 'HD',
    categoryId: '', isFeatured: false, publishAt: '',
  };
  const [form, setForm] = useState(defaultForm);

  const [episodeForm, setEpisodeForm] = useState({
    episodeNumber: 1, title: '', description: '', duration: 0, stillUrl: '', videoUrl: '',
  });

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [seriesRes, catsRes] = await Promise.all([
        adminApi.getSeries({ page, limit: 20, search }),
        adminApi.getCategories(),
      ]);
      if (seriesRes.data.success) {
        setSeries(seriesRes.data.data);
        setTotalPages(seriesRes.data.pagination?.totalPages || 1);
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
      title: s.title, type: 'SERIES', description: s.description || '',
      posterUrl: s.posterUrl || '', coverUrl: s.coverUrl || '', trailerUrl: s.trailerUrl || '',
      year: s.year || new Date().getFullYear(), imdbRating: s.imdbRating || 0, director: s.director || '',
      cast: (s.cast || []).join(', '), tags: (s.tags || []).join(', '),
      country: s.country || '', language: s.language || 'Türkce', quality: s.quality,
      categoryId: s.categoryId || '', isFeatured: s.isFeatured, publishAt: (s as any).publishAt || '',
    });
    setEditId(s.id); setTmdbId(''); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error(t('common.error')); return; }
    const data = {
      ...form,
      cast: form.cast.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      year: Number(form.year),
    };
    try {
      editId
        ? (await adminApi.updateContent(editId, data), toast.success(t('common.save')))
        : (await adminApi.createContent(data), toast.success(t('common.create')));
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
      a.href = url;
      a.download = `series_export.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error(t('common.error')); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length} ${t('admin.selected_count')}`)) return;
    try { await adminApi.bulkDelete(selectedIds); toast.success(t('common.delete')); setSelectedIds([]); loadData(); }
    catch { toast.error(t('common.error')); }
  };

  const handleTmdbLookup = async () => {
    if (!tmdbId.trim()) { toast.error(t('admin.tmdb_id')); return; }
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
          cast: meta.cast || f.cast,
          tags: meta.tags || meta.genres || f.tags,
          country: meta.country || f.country,
          language: meta.language || f.language,
        }));
        toast.success(t('admin.metadata_fetched'));
      }
    } catch { toast.error(t('common.error')); }
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
    if (selectedIds.length === filteredSeries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSeries.map(s => s.id));
    }
  };

  const filteredSeries = series.filter(s => {
    if (filterCategory && s.categoryId !== filterCategory) return false;
    if (filterYear && String(s.year) !== filterYear) return false;
    return true;
  });

  const years = Array.from(new Set(series.map(s => s.year).filter(Boolean) as number[])).sort((a, b) => b - a);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.series')}</h1>
          <p className="text-sm text-gray-500 mt-1">{series.length} {t('admin.total_series').toLowerCase()}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> {t('admin.series')} {t('common.create')}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text" placeholder={`${t('admin.series')} ${t('common.search')}...`}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), loadData())}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 transition-all"
          />
        </div>
        <button onClick={() => { setPage(1); loadData(); }} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-all">
          {t('common.search')}
        </button>
        <button onClick={() => handleExport('csv')} className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-all">
          <HiArrowDownTray className="w-4 h-4" /> {t('admin.export_csv')}
        </button>
        <button onClick={() => handleExport('json')} className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-all">
          <HiArrowDownTray className="w-4 h-4" /> {t('admin.export_json')}
        </button>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiSquares2X2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiListBullet className="w-4 h-4" />
          </button>
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-[#E50914]/50">
          <option value="">{t('admin.select_all')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-[#E50914]/50">
          <option value="">{t('admin.select_all')}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-3'}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={viewMode === 'grid'
              ? 'bg-white/5 rounded-xl overflow-hidden animate-pulse'
              : 'flex items-center gap-4 bg-white/5 rounded-xl p-3 animate-pulse'
            }>
              {viewMode === 'grid' ? (
                <>
                  <div className="aspect-[2/3] bg-white/10" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/10 rounded w-1/2" />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-16 bg-white/10 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-3 bg-white/10 rounded w-1/4" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredSeries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiMagnifyingGlassCircle className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('search.no_results')}</h3>
          <p className="text-sm text-gray-600 mb-4">{search ? `${t('common.search')}: "${search}"` : t('common.create')}</p>
          {!search && <button onClick={openCreate} className="text-sm text-[#E50914] hover:underline">{t('common.create')}</button>}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filteredSeries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredSeries.map(s => (
            <SeriesCard key={s.id} series={s} onEdit={openEdit} onDelete={setDeleteId} onExpand={toggleExpand} expandedId={expandedId} seasons={seasons} selectedContentId={selectedContentId} addSeason={addSeason} onAddEpisode={(seasonId: string, epNum: number, contentId: string) => {
              setSelectedSeasonId(seasonId);
              setSelectedContentId(contentId);
              setEpisodeForm({ episodeNumber: epNum, title: '', description: '', duration: 0, stillUrl: '', videoUrl: '' });
              setShowEpisodeModal(true);
            }} onDeleteEpisode={deleteEpisode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
          ))}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && filteredSeries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">
            <div className="w-8 shrink-0 flex items-center justify-center">
              <button onClick={toggleSelectAll} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedIds.length === filteredSeries.length && filteredSeries.length > 0 ? 'bg-[#E50914] border-[#E50914]' : 'border-gray-600 hover:border-gray-400'}`}>
                {selectedIds.length === filteredSeries.length && filteredSeries.length > 0 && <div className="w-2 h-2 bg-white rounded-full" />}
              </button>
            </div>
            <div className="w-12 shrink-0" />
            <div className="flex-1">{t('common.filter')}</div>
            <div className="w-20 shrink-0">{t('content.year')}</div>
            <div className="w-24 shrink-0">{t('common.status')}</div>
            <div className="w-24 shrink-0">{t('common.actions')}</div>
          </div>
          {filteredSeries.map(s => (
            <SeriesRow key={s.id} series={s} onEdit={openEdit} onDelete={setDeleteId} onExpand={toggleExpand} expandedId={expandedId} seasons={seasons} selectedContentId={selectedContentId} addSeason={addSeason} onAddEpisode={(seasonId: string, epNum: number, contentId: string) => {
              setSelectedSeasonId(seasonId);
              setSelectedContentId(contentId);
              setEpisodeForm({ episodeNumber: epNum, title: '', description: '', duration: 0, stillUrl: '', videoUrl: '' });
              setShowEpisodeModal(true);
            }} onDeleteEpisode={deleteEpisode} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
          ))}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl shadow-black/50">
          <span className="text-sm text-gray-300 font-medium">{selectedIds.length} {t('admin.selected_count')}</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all">
            <HiTrash className="w-3.5 h-3.5" /> {t('admin.bulk_delete')}
          </button>
          <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-lg text-xs transition-all">
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Slide-in Drawer for Create/Edit */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-[#141414] border-l border-white/10 shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#141414]/95 backdrop-blur-sm border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{editId ? t('common.edit') : t('common.create')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* TMDB Auto-fill */}
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('admin.tmdb_lookup')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('admin.tmdb_id')}
                    value={tmdbId}
                    onChange={e => setTmdbId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50"
                  />
                  <button onClick={handleTmdbLookup} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all whitespace-nowrap">
                    {t('admin.fetch_metadata')}
                  </button>
                </div>
              </div>

              {/* Poster Preview */}
              <div className="flex gap-4">
                <div className="w-32 shrink-0">
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Poster</label>
                  <div className="aspect-[2/3] rounded-lg bg-white/5 border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center cursor-pointer hover:border-[#E50914]/50 transition-all" onClick={() => posterInputRef.current?.click()}>
                    {form.posterUrl ? (
                      <img src={form.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <HiPhoto className="w-6 h-6 text-gray-600 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-600">Poster Yukle</span>
                      </div>
                    )}
                  </div>
                  <input ref={posterInputRef} type="hidden" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Baslik *</label>
                    <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" placeholder="Dizi adi" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('content.year')}</label>
                      <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('content.imdb')}</label>
                      <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" step="0.1" min="0" max="10" value={form.imdbRating} onChange={e => setForm(f => ({ ...f, imdbRating: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Aciklama</label>
                <textarea className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 resize-none h-24" placeholder="Dizi konusu..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* URLs */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Poster URL</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.posterUrl} onChange={e => setForm(f => ({ ...f, posterUrl: e.target.value }))} />
                  {form.posterUrl && <img src={form.posterUrl} alt="" className="mt-2 h-20 rounded object-cover" />}
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Kapak URL</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} />
                  {form.coverUrl && <img src={form.coverUrl} alt="" className="mt-2 h-16 rounded object-cover" />}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Yonetmen</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="Yonetmen adi" value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Ulke</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="Turkiye" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Oyuncular</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="Ad Soyad, Ad Soyad" value={form.cast} onChange={e => setForm(f => ({ ...f, cast: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Etiketler</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50" placeholder="Drama, Aksiyon" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>

              {/* Selects */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('content.language')}</label>
                  <select className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="Türkce">Türkce</option><option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('content.quality')}</label>
                  <select className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}>
                    <option value="HD">HD</option><option value="FULL_HD">Full HD</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('admin.categories')}</label>
                  <select className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Sec</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Featured Toggle */}
              <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <div className={`w-10 h-6 rounded-full transition-all relative ${form.isFeatured ? 'bg-[#E50914]' : 'bg-white/20'}`} onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isFeatured ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-gray-300">One Cikan Dizi</span>
              </label>

              {/* Schedule Toggle */}
              <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all">
                <div className={`w-10 h-6 rounded-full transition-all relative ${form.publishAt ? 'bg-[#E50914]' : 'bg-white/20'}`} onClick={() => setForm(f => ({ ...f, publishAt: f.publishAt ? '' : new Date().toISOString().slice(0, 16) }))}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.publishAt ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-gray-300">{t('admin.schedule_publish')}</span>
              </label>
              {form.publishAt && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">{t('admin.publish_date')}</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50"
                    value={form.publishAt}
                    onChange={e => setForm(f => ({ ...f, publishAt: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="sticky bottom-0 p-4 bg-[#141414]/95 backdrop-blur-sm border-t border-white/10 flex gap-3">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all">
                {editId ? t('common.save') : t('common.create')}
              </button>
              <button onClick={() => setShowDrawer(false)} className="px-6 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-lg text-sm transition-all">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                <HiExclamationTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('common.delete')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">{t('admin.restore_confirm')}</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all">{t('common.delete')}</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-lg text-sm transition-all">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Episode Modal */}
      {showEpisodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowEpisodeModal(false)}>
          <div className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{t('content.episodes')} {t('common.create')}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t('content.episodes')} #</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={episodeForm.episodeNumber} onChange={e => setEpisodeForm(f => ({ ...f, episodeNumber: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t('content.duration')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={episodeForm.duration} onChange={e => setEpisodeForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t('common.filter')}</label>
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
      `}</style>
    </div>
  );
}

/* ─── Card Component (Grid View) ─── */
function SeriesCard({ series: s, onEdit, onDelete, onExpand, expandedId, seasons, selectedContentId, addSeason, onAddEpisode, onDeleteEpisode, selectedIds, onToggleSelect }: any) {
  const [showEpisodes, setShowEpisodes] = useState(false);
  const isExpanded = expandedId === s.id;
  const isSelected = selectedIds?.includes(s.id);

  return (
    <div className="group relative bg-white/5 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all hover:shadow-xl hover:shadow-black/20">
      {/* Selection Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(s.id); }}
        className={`absolute top-2 left-2 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#E50914] border-[#E50914]' : 'border-gray-500/50 bg-black/50 hover:border-gray-300'}`}
      >
        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
      </button>

      {/* Poster */}
      <div className="relative aspect-[2/3] bg-white/5 cursor-pointer" onClick={() => onExpand(s.id)}>
        {s.posterUrl ? (
          <img src={s.posterUrl} alt={s.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HiPhoto className="w-10 h-10 text-gray-700" />
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
          <p className="text-xs text-gray-300 line-clamp-2 mb-2">{s.description || 'Aciklama yok'}</p>
          <div className="flex gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onEdit(s); }} className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-all backdrop-blur-sm">Duzenle</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="py-1.5 px-3 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs transition-all backdrop-blur-sm"><HiTrash className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {/* IMDB Badge */}
        {s.imdbRating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <HiStar className="w-3 h-3 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">{s.imdbRating}</span>
          </div>
        )}
        {/* Active Badge */}
        <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${s.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-white truncate">{s.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 flex items-center gap-1"><HiCalendar className="w-3 h-3" />{s.year}</span>
          <span className="text-xs text-gray-600">|</span>
          <span className="text-xs text-gray-500">{s.language}</span>
          <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${s.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{s.isActive ? 'Aktif' : 'Pasif'}</span>
        </div>
      </div>

      {/* Expanded Season/Episode Panel */}
      {isExpanded && (
        <div className="border-t border-white/10 p-3 bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sezonlar & Bolumler</span>
            <button onClick={() => addSeason(s.id, (seasons.length || 0) + 1)} className="text-[10px] text-[#E50914] hover:text-red-400 font-medium">+ Sezon</button>
          </div>
          {seasons.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">Henuz sezon yok</p>
          ) : seasons.map((season: Season) => (
            <div key={season.id} className="mb-2 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-300 font-medium">Sezon {season.seasonNumber}</span>
                <button onClick={() => onAddEpisode(season.id, (season.episodes?.length || 0) + 1, s.id)} className="text-[10px] text-[#E50914] hover:text-red-400">+ Bolum</button>
              </div>
              <div className="space-y-1">
                {season.episodes?.map((ep: Episode) => (
                  <div key={ep.id} className="flex items-center gap-2 bg-white/5 rounded px-2 py-1.5 group/ep">
                    {ep.stillUrl ? (
                      <img src={ep.stillUrl} alt="" className="w-8 h-5 rounded object-cover" />
                    ) : (
                      <HiPlay className="w-3 h-3 text-gray-600 shrink-0" />
                    )}
                    <span className="text-[11px] text-gray-300 truncate flex-1">{ep.episodeNumber}. {ep.title}</span>
                    {ep.duration ? <span className="text-[10px] text-gray-600">{ep.duration}dk</span> : null}
                    <button onClick={() => onDeleteEpisode(ep.id)} className="opacity-0 group-hover/ep:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all">
                      <HiTrash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Row Component (List View) ─── */
function SeriesRow({ series: s, onEdit, onDelete, onExpand, expandedId, seasons, selectedContentId, addSeason, onAddEpisode, onDeleteEpisode, selectedIds, onToggleSelect }: any) {
  const isExpanded = expandedId === s.id;
  const isSelected = selectedIds?.includes(s.id);

  return (
    <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden hover:border-white/15 transition-all">
      <div className="flex items-center gap-4 p-3 cursor-pointer" onClick={() => onExpand(s.id)}>
        {/* Checkbox */}
        <div className="w-8 shrink-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onToggleSelect(s.id)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#E50914] border-[#E50914]' : 'border-gray-600 hover:border-gray-400'}`}
          >
            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
          </button>
        </div>

        {/* Poster */}
        <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
          {s.posterUrl ? <img src={s.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><HiPhoto className="w-5 h-5 text-gray-700" /></div>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{s.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{s.year}</span>
            {s.imdbRating > 0 && <span className="text-xs text-yellow-400 flex items-center gap-0.5"><HiStar className="w-3 h-3" />{s.imdbRating}</span>}
            <span className="text-xs text-gray-600">{s.language}</span>
          </div>
        </div>

        {/* Status */}
        <span className={`text-xs px-2 py-1 rounded-full ${s.isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {s.isActive ? 'Aktif' : 'Pasif'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(s); }} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><HiPencil className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(s.id); }} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><HiTrash className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onExpand(s.id); }} className="p-2 text-gray-500 hover:text-white transition-all">
            {isExpanded ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="border-t border-white/10 p-4 bg-black/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sezonlar & Bolumler</span>
            <button onClick={() => addSeason(s.id, (seasons.length || 0) + 1)} className="text-xs text-[#E50914] hover:text-red-400 font-medium">+ Sezon Ekle</button>
          </div>
          {seasons.length === 0 ? (
            <p className="text-sm text-gray-600 py-4 text-center">Henuz sezon eklenmemis</p>
          ) : seasons.map((season: Season) => (
            <div key={season.id} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300 font-medium">Sezon {season.seasonNumber}{season.title ? ` - ${season.title}` : ''}</span>
                <button onClick={() => onAddEpisode(season.id, (season.episodes?.length || 0) + 1, s.id)} className="text-xs text-[#E50914] hover:text-red-400">+ Bolum Ekle</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {season.episodes?.map((ep: Episode) => (
                  <div key={ep.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5 group/ep hover:bg-white/10 transition-all">
                    {ep.stillUrl ? (
                      <img src={ep.stillUrl} alt="" className="w-16 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center shrink-0">
                        <HiPlay className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">Bolum {ep.episodeNumber}</p>
                      <p className="text-[11px] text-gray-500 truncate">{ep.title}</p>
                    </div>
                    {ep.duration ? <span className="text-[10px] text-gray-600 shrink-0">{ep.duration}dk</span> : null}
                    <button onClick={() => onDeleteEpisode(ep.id)} className="opacity-0 group-hover/ep:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all shrink-0">
                      <HiTrash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
