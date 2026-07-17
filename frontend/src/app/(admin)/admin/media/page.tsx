'use client';

import { useState, useEffect, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { MediaFile } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiMagnifyingGlass, HiSquares2X2, HiListBullet, HiTrash,
  HiPhoto, HiFilm, HiDocumentText, HiExclamationTriangle,
  HiServerStack,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'video' | 'image';

export default function AdminMedia() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteFile, setDeleteFile] = useState<MediaFile | null>(null);
  const [stats, setStats] = useState<{ totalFiles: number; totalSize: number; videoCount: number; imageCount: number; subtitleCount: number } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mediaRes, statsRes] = await Promise.allSettled([
        adminApi.getMediaList({ type: filter === 'all' ? undefined : filter }),
        adminApi.getMediaStats(),
      ]);
      if (mediaRes.status === 'fulfilled' && mediaRes.value.data.success) {
        setFiles(Array.isArray(mediaRes.value.data.data) ? mediaRes.value.data.data : []);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setStats(statsRes.value.data.data || {});
      }
    } catch {
      toast.error(t('common.error'));
    }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteFile) return;
    try {
      await adminApi.deleteMedia(deleteFile.name);
      toast.success(t('common.delete'));
      setDeleteFile(null);
      loadData();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    return files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  }, [files, search]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('video')) return HiFilm;
    if (type.includes('image')) return HiPhoto;
    return HiDocumentText;
  };

  const getFileColor = (type: string) => {
    if (type.includes('video')) return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
    if (type.includes('image')) return { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    return { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.media_manager')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('admin.total_files')}: {files.length}</p>
        </div>
      </div>

      {/* Storage Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <HiServerStack className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-[13px] text-gray-500 font-medium">{t('admin.storage_used')}</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-1">{formatSize(stats.totalSize)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <HiFilm className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <p className="text-[13px] text-gray-500 font-medium">{t('admin.videos')}</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-1">{stats.videoCount}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                <HiPhoto className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <p className="text-[13px] text-gray-500 font-medium">{t('admin.images')}</p>
            <p className="text-2xl font-bold text-white tracking-tight mt-1">{stats.imageCount}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder={`${t('common.search')}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          {(['all', 'video', 'image'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'
              }`}
            >
              {f === 'all' ? t('admin.select_all') : f === 'video' ? t('admin.videos') : t('admin.images')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiSquares2X2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiListBullet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!loading && filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <HiServerStack className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('search.no_results')}</h3>
          <p className="text-sm text-gray-600">{t('admin.total_files')}: 0</p>
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && filteredFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file, idx) => {
            const FileIcon = getFileIcon(file.type);
            const colors = getFileColor(file.type);
            return (
              <div key={idx} className="group rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all">
                <div className={`w-full aspect-square rounded-xl border ${colors.bg} flex items-center justify-center mb-3`}>
                  <FileIcon className={`w-8 h-8 ${colors.color}`} />
                </div>
                <p className="text-sm text-white truncate mb-0.5">{file.name}</p>
                <p className="text-[11px] text-gray-600">{formatSize(file.size)}</p>
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => setDeleteFile(file)}
                    className="flex-1 py-1.5 bg-white/[0.04] hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg text-xs font-medium transition-all"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && filteredFiles.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.media_manager')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.storage_used')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.status')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.date')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredFiles.map((file, idx) => {
                  const FileIcon = getFileIcon(file.type);
                  const colors = getFileColor(file.type);
                  return (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border ${colors.bg}`}>
                            <FileIcon className={`w-4 h-4 ${colors.color}`} />
                          </div>
                          <p className="text-sm text-white truncate max-w-xs">{file.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-400">{formatSize(file.size)}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">
                          {file.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(file.modifiedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setDeleteFile(file)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title={t('common.delete')}
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteFile(null)}>
          <div className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                <HiExclamationTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('common.delete')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2 ml-[52px]">{deleteFile.name}</p>
            <p className="text-xs text-gray-600 mb-5 ml-[52px]">{formatSize(deleteFile.size)}</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">{t('common.delete')}</button>
              <button onClick={() => setDeleteFile(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl text-sm transition-all">{t('common.cancel')}</button>
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
