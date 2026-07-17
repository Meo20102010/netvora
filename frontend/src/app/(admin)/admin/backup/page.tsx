'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Backup } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiArrowPath, HiCloudArrowUp, HiArrowDownTray,
  HiExclamationTriangle, HiCalendarDays, HiDocumentDuplicate,
  HiServerStack, HiCheckCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminBackup() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoreModal, setRestoreModal] = useState<Backup | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listBackups();
      if (res.data.success) {
        setBackups(Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch {
      toast.error(t('common.error'));
    }
    finally { setLoading(false); }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      await adminApi.createBackup();
      toast.success(t('admin.backup_created'));
      loadBackups();
    } catch {
      toast.error(t('common.error'));
    }
    finally { setCreating(false); }
  };

  const handleRestore = async () => {
    if (!restoreModal) return;
    setRestoring(true);
    try {
      await adminApi.restoreBackup(restoreModal.id);
      toast.success(t('admin.restore'));
      setRestoreModal(null);
    } catch {
      toast.error(t('common.error'));
    }
    finally { setRestoring(false); }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const res = await adminApi.downloadBackup(backup.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalSize = backups.reduce((acc, b) => acc + b.size, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.backup')}</h1>
          <p className="text-sm text-gray-600 mt-1">{t('admin.total_files')}: {backups.length}</p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20"
        >
          {creating ? (
            <HiArrowPath className="w-4 h-4 animate-spin" />
          ) : (
            <HiCloudArrowUp className="w-4 h-4" />
          )}
          {t('admin.create_backup')}
        </button>
      </div>

      {/* Storage Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <HiServerStack className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-[13px] text-gray-500 font-medium">{t('admin.storage_used')}</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1">{formatSize(totalSize)}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <HiDocumentDuplicate className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-[13px] text-gray-500 font-medium">{t('admin.total_files')}</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1">{backups.length}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <HiCalendarDays className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-[13px] text-gray-500 font-medium">{t('common.date')}</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1">
            {backups.length > 0
              ? new Date(backups[0].createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
              : '-'
            }
          </p>
        </div>
      </div>

      {/* Backup List */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#E50914]/10">
              <HiDocumentDuplicate className="w-4 h-4 text-[#E50914]" />
            </div>
            <h3 className="text-sm font-semibold text-white">{t('admin.backup')}</h3>
          </div>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {backups.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <HiServerStack className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t('admin.no_errors')}</p>
            </div>
          ) : backups.map((backup) => (
            <div key={backup.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20">
                <HiCheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{backup.filename}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-gray-600">{formatSize(backup.size)}</span>
                  <span className="text-[11px] text-gray-600">
                    {new Date(backup.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(backup)}
                  className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                  title={t('admin.restore')}
                >
                  <HiArrowDownTray className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRestoreModal(backup)}
                  className="px-3 py-1.5 bg-white/[0.04] hover:bg-[#E50914]/10 text-gray-400 hover:text-[#E50914] rounded-lg text-xs font-medium transition-all"
                >
                  {t('admin.restore')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setRestoreModal(null)}>
          <div className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center">
                <HiExclamationTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('admin.restore')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2 ml-[52px]">{t('admin.restore_confirm')}</p>
            <p className="text-xs text-gray-600 mb-5 ml-[52px]">{restoreModal.filename}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all"
              >
                {restoring ? <HiArrowPath className="w-4 h-4 animate-spin mx-auto" /> : t('admin.restore')}
              </button>
              <button
                onClick={() => setRestoreModal(null)}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl text-sm transition-all"
              >
                {t('common.cancel')}
              </button>
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
