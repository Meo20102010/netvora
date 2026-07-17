'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi, contentApi } from '@/lib/api';
import { Content, Category } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiMagnifyingGlass, HiPlus, HiPencil, HiTrash, HiChevronLeft, HiChevronRight,
  HiXMark, HiStar, HiPhoto, HiCalendar, HiSquares2X2, HiListBullet,
  HiMagnifyingGlassCircle, HiExclamationTriangle, HiPlay, HiArrowDownTray,
  HiDocumentText,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const defaultForm = {
  title: '', type: 'MOVIE', description: '', posterUrl: '', coverUrl: '', trailerUrl: '',
  year: new Date().getFullYear(), duration: 0, imdbRating: 0, director: '',
  cast: '', tags: '', country: '', language: 'Turkce', quality: 'HD',
  categoryId: '', isFeatured: false, videoUrl: '', publishAt: '',
};

export default function AdminMovies() {
  const { t } = useTranslation();
  const [movies, setMovies] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [tmdbId, setTmdbId] = useState('');
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [moviesRes, catsRes] = await Promise.all([
        adminApi.getMovies({ page, limit: 20, search }),
        adminApi.getCategories(),
      ]);
      if (moviesRes.data.success) {
        setMovies(moviesRes.data.data);
        setTotalPages(moviesRes.data.pagination?.totalPages || 1);
      }
      if (catsRes.data.success) setCategories(catsRes.data.data);
    } catch { toast.error(t('admin.movies_load_error')); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm(defaultForm); setEditId(null); setTmdbId(''); setShowDrawer(true); };
  const openEdit = (m: Content) => {
    setForm({
      title: m.title, type: 'MOVIE', description: m.description || '',
      posterUrl: m.posterUrl || '', coverUrl: m.coverUrl || '', trailerUrl: m.trailerUrl || '',
      year: m.year || new Date().getFullYear(), duration: m.duration || 0,
      imdbRating: m.imdbRating || 0, director: m.director || '',
      cast: (m.cast || []).join(', '), tags: (m.tags || []).join(', '),
      country: m.country || '', language: m.language || 'Turkce', quality: m.quality,
      categoryId: m.categoryId || '', isFeatured: m.isFeatured, videoUrl: m.videos?.[0]?.url || '',
      publishAt: (m as any).publishAt || '',
    });
    setEditId(m.id);
    setTmdbId('');
    setShowDrawer(true);
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
        toast.success(t('admin.movie_updated'));
      } else {
        const res = await adminApi.createContent(data);
        if (res.data.success && form.videoUrl) {
          await adminApi.addVideo(res.data.data.id, { url: form.videoUrl, quality: form.quality });
        }
        toast.success(t('admin.movie_created'));
      }
      setShowDrawer(false);
      loadData();
    } catch { toast.error(t('admin.action_failed')); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await adminApi.deleteContent(deleteId); toast.success(t('admin.movie_deleted')); setDeleteId(null); loadData(); }
    catch { toast.error(t('admin.delete_movie_failed')); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await adminApi.bulkDelete(selectedIds);
      toast.success(`${selectedIds.length} ${t('admin.movie_deleted')}`);
      setSelectedIds([]);
      setSelectAll(false);
      loadData();
    } catch { toast.error(t('admin.bulk_delete_failed')); }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await adminApi.exportContent(format);
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${format.toUpperCase()} ${t('admin.exported')}`);
    } catch { toast.error(t('admin.export_failed')); }
  };

  const handleTmdbLookup = async () => {
    if (!tmdbId.trim()) { toast.error(t('admin.tmdb_id_required')); return; }
    setTmdbLoading(true);
    try {
      const res = await adminApi.tmdbLookup(tmdbId, 'movie');
      if (res.data.success) {
        const m = res.data.data;
        setForm(f => ({
          ...f,
          title: m.title || f.title,
          description: m.description || m.overview || f.description,
          posterUrl: m.posterUrl || m.poster_path || f.posterUrl,
          coverUrl: m.coverUrl || m.backdrop_path || f.coverUrl,
          year: m.year || m.release_date?.substring(0, 4) ? Number(m.release_date.substring(0, 4)) : f.year,
          imdbRating: m.imdbRating || m.vote_average || f.imdbRating,
          director: m.director || f.director,
          cast: m.cast ? (Array.isArray(m.cast) ? m.cast.join(', ') : m.cast) : f.cast,
          tags: m.tags ? (Array.isArray(m.tags) ? m.tags.join(', ') : m.tags) : f.tags,
        }));
        toast.success(t('admin.metadata_fetched'));
      }
    } catch { toast.error(t('admin.tmdb_search_failed')); }
    finally { setTmdbLoading(false); }
  };

  const filteredMovies = movies.filter(m => {
    if (filterCategory && m.categoryId !== filterCategory) return false;
    if (filterYear && String(m.year) !== filterYear) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(filteredMovies.map(m => m.id));
      setSelectAll(true);
    }
  };

  useEffect(() => {
    if (selectedIds.length === filteredMovies.length && filteredMovies.length > 0) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedIds, filteredMovies]);

  const years = Array.from(new Set(movies.map(m => m.year).filter(Boolean) as number[])).sort((a, b) => b - a);

  const CheckboxIcon = ({ checked }: { checked: boolean }) => (
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
      checked ? 'bg-[#E50914] border-[#E50914]' : 'border-white/20 bg-white/5 hover:border-white/40'
    }`}>
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.movies')}</h1>
          <p className="text-sm text-gray-600 mt-1">{movies.length} {t('common.total')}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> {t('admin.add_movie')}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text" placeholder={t('admin.search_movies')}
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
          <option value="">{t('admin.all_categories')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 focus:outline-none focus:border-[#E50914]/50">
          <option value="">{t('admin.all_years')}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">
          <HiDocumentText className="w-4 h-4" /> {t('admin.export_csv')}
        </button>
        <button onClick={() => handleExport('json')} className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">
          <HiArrowDownTray className="w-4 h-4" /> {t('admin.export_json')}
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
                <>
                  <div className="aspect-[2/3] bg-white/[0.04]" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-white/[0.04] rounded w-3/4" />
                    <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-16 bg-white/[0.04] rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/[0.04] rounded w-1/3" />
                    <div className="h-3 bg-white/[0.04] rounded w-1/4" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMovies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiMagnifyingGlassCircle className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_movies_found')}</h3>
          <p className="text-sm text-gray-600 mb-4">{search ? `"${search}" ${t('admin.no_search_results')}` : t('admin.no_movies_yet')}</p>
          {!search && <button onClick={openCreate} className="text-sm text-[#E50914] hover:underline">{t('admin.create_first_movie')}</button>}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filteredMovies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMovies.map(m => {
            const isSelected = selectedIds.includes(m.id);
            return (
              <div key={m.id} className={`group relative bg-white/[0.02] rounded-2xl overflow-hidden border transition-all hover:shadow-xl hover:shadow-black/20 ${isSelected ? 'border-[#E50914]/40 bg-[#E50914]/[0.03]' : 'border-white/[0.04] hover:border-white/[0.08]'}`}>
                <div className="relative aspect-[2/3] bg-white/[0.04]">
                  {m.posterUrl ? (
                    <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <HiPhoto className="w-10 h-10 text-gray-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
                    <p className="text-xs text-gray-300 line-clamp-2 mb-2">{m.description || t('admin.no_description')}</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(m)} className="flex-1 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-all backdrop-blur-sm">{t('common.edit')}</button>
                      <button onClick={() => setDeleteId(m.id)} className="py-1.5 px-3 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs transition-all backdrop-blur-sm"><HiTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelection(m.id); }}
                    className="absolute top-2 left-2 z-10"
                  >
                    <CheckboxIcon checked={isSelected} />
                  </button>
                  {!!m.imdbRating && m.imdbRating > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <HiStar className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">{m.imdbRating}</span>
                    </div>
                  )}
                  <div className={`absolute bottom-2 left-2 w-2 h-2 rounded-full ${m.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-white truncate">{m.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><HiCalendar className="w-3 h-3" />{m.year}</span>
                    <span className="text-xs text-gray-600">|</span>
                    <span className="text-xs text-gray-500">{m.language}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${m.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{m.isActive ? t('admin.active') : t('admin.inactive')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && filteredMovies.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-5 py-3 text-left w-10">
                    <button onClick={toggleSelectAll}>
                      <CheckboxIcon checked={selectAll} />
                    </button>
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.table_poster')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.table_title')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.table_year')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.table_imdb')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.table_category')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.status')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredMovies.map(m => {
                  const isSelected = selectedIds.includes(m.id);
                  return (
                    <tr key={m.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-[#E50914]/[0.03]' : ''}`}>
                      <td className="px-5 py-3">
                        <button onClick={() => toggleSelection(m.id)}>
                          <CheckboxIcon checked={isSelected} />
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
                          {m.posterUrl ? <img src={m.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><HiPhoto className="w-4 h-4 text-gray-700" /></div>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-white">{m.title}</p>
                        <p className="text-[11px] text-gray-600 truncate max-w-[200px]">{m.director || m.description || '-'}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{m.year}</td>
                      <td className="px-5 py-3">
                        {!!m.imdbRating && m.imdbRating > 0 ? (
                          <span className="text-sm text-amber-400 flex items-center gap-1"><HiStar className="w-3.5 h-3.5" />{m.imdbRating}</span>
                        ) : <span className="text-sm text-gray-600">-</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{m.category?.name || '-'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {m.isActive ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(m)} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><HiPencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteId(m.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><HiTrash className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
            <span className="text-sm font-medium text-white whitespace-nowrap">{selectedIds.length} {t('admin.selected_count')}</span>
            <div className="w-px h-6 bg-white/10" />
            <button className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-sm font-medium transition-all">
              {t('admin.bulk_edit')}
            </button>
            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium transition-all">
              {t('admin.bulk_delete')}
            </button>
            <button onClick={() => { setSelectedIds([]); setSelectAll(false); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm transition-all">
              {t('admin.select_all')}
            </button>
          </div>
        </div>
      )}

      {/* Slide-in Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-[#0a0a0a] border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editId ? t('admin.edit_movie') : t('admin.add_movie')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* TMDB Lookup */}
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-2 block font-medium">{t('admin.tmdb_lookup')}</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50"
                    placeholder={t('admin.tmdb_id')}
                    value={tmdbId}
                    onChange={e => setTmdbId(e.target.value)}
                  />
                  <button
                    onClick={handleTmdbLookup}
                    disabled={tmdbLoading}
                    className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {tmdbLoading ? '...' : t('admin.fetch_metadata')}
                  </button>
                </div>
              </div>

              {/* Poster Preview */}
                <div className="flex gap-4">
                <div className="w-32 shrink-0">
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.table_poster')}</label>
                  <div className="aspect-[2/3] rounded-xl bg-white/[0.03] border-2 border-dashed border-white/[0.06] overflow-hidden flex items-center justify-center cursor-pointer hover:border-[#E50914]/50 transition-all" onClick={() => posterInputRef.current?.click()}>
                    {form.posterUrl ? (
                      <img src={form.posterUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <HiPhoto className="w-6 h-6 text-gray-700 mx-auto mb-1" />
                        <span className="text-[10px] text-gray-700">{t('admin.poster_upload')}</span>
                      </div>
                    )}
                  </div>
                  <input ref={posterInputRef} type="hidden" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.table_title')} *</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" placeholder={t('admin.movie_name')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.table_year')}</label>
                      <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.duration_minutes')}</label>
                      <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.description')}</label>
                <textarea className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 resize-none h-24" placeholder={t('admin.movie_plot')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* URLs */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.image_url')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.posterUrl} onChange={e => setForm(f => ({ ...f, posterUrl: e.target.value }))} />
                  {form.posterUrl && <img src={form.posterUrl} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.cover_url')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.coverUrl} onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.video_url')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.trailer_url')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.trailerUrl} onChange={e => setForm(f => ({ ...f, trailerUrl: e.target.value }))} />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.director_name')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder={t('admin.director_name')} value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.country')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Türkiye" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.actors')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Ad Soyad, Ad Soyad" value={form.cast} onChange={e => setForm(f => ({ ...f, cast: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.tags')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="Drama, Aksiyon" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>

              {/* Selects */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.language_currency')}</label>
                  <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    <option value="Turkce">Türkçe</option><option value="English">English</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.quality_label')}</label>
                  <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: e.target.value }))}>
                    <option value="SD">SD</option><option value="HD">HD</option><option value="FULL_HD">Full HD</option><option value="UHD_4K">4K</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.table_category')}</label>
                  <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">{t('admin.select')}</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* IMDB + Featured */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.imdb_rating')}</label>
                  <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" step="0.1" min="0" max="10" value={form.imdbRating} onChange={e => setForm(f => ({ ...f, imdbRating: Number(e.target.value) }))} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all border border-white/[0.04]">
                    <div className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${form.isFeatured ? 'bg-[#E50914]' : 'bg-white/10'}`} onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.isFeatured ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-sm text-gray-300">{t('admin.featured')}</span>
                  </label>
                </div>
              </div>

              {/* Schedule Publish */}
              <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] text-gray-600 uppercase tracking-wider block font-medium">{t('admin.schedule_publish')}</label>
                  <div
                    className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${form.publishAt ? 'bg-[#E50914]' : 'bg-white/10'}`}
                    onClick={() => setForm(f => ({ ...f, publishAt: f.publishAt ? '' : new Date().toISOString().slice(0, 16) }))}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.publishAt ? 'left-5' : 'left-1'}`} />
                  </div>
                </div>
                {form.publishAt ? (
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50"
                    value={form.publishAt}
                    onChange={e => setForm(f => ({ ...f, publishAt: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm text-gray-500">{t('admin.publish_now')}</p>
                )}
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
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                <HiExclamationTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('admin.delete_movie')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">{t('admin.delete_movie_confirm')}</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">{t('common.delete')}</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl text-sm transition-all">{t('common.cancel')}</button>
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
