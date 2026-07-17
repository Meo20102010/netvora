'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import toast from 'react-hot-toast';
import {
  HiFolderOpen, HiMagnifyingGlass, HiArrowDownTray, HiCheckCircle,
  HiXCircle, HiTv, HiFilm, HiServerStack, HiClock, HiExclamationTriangle,
} from 'react-icons/hi2';

interface Episode {
  name: string;
  fullPath: string;
  seasonNumber: number;
  episodeNumber: number;
}

interface Season {
  name: string;
  number: number;
  episodes: Episode[];
}

interface ScannedSeries {
  name: string;
  fullPath: string;
  seasons: Season[];
  totalEpisodes: number;
}

interface ImportProgress {
  id: string;
  status: 'scanning' | 'importing' | 'completed' | 'error';
  totalSeries: number;
  processedSeries: number;
  currentSeries: string;
  totalEpisodes: number;
  processedEpisodes: number;
  totalSize: number;
  copiedSize: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}sa ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

export default function ImportPage() {
  const { t } = useTranslation();
  const [folderPath, setFolderPath] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<{ series: ScannedSeries[]; totalSeries: number; totalEpisodes: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  const handleScan = async () => {
    if (!folderPath.trim()) { toast.error(t('admin.folder_error')); return; }
    setScanning(true);
    setScanned(null);
    try {
      const res = await adminApi.scanFolder(folderPath.trim());
      if (res.data.success) {
        setScanned(res.data.data);
        const allNames = res.data.data.series.map((s: ScannedSeries) => s.name);
        setSelectedSeries(new Set(allNames));
        toast.success(`${res.data.data.totalSeries} ${t('admin.series_label')}, ${res.data.data.totalEpisodes} ${t('admin.episodes_label')} ${t('admin.found_result')}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('admin.scan_error'));
    } finally {
      setScanning(false);
    }
  };

  const handleImport = async () => {
    if (!scanned) return;
    if (!folderPath.trim()) return;

    const genreVal = genre.trim() || undefined;
    const yearVal = year ? parseInt(year) : undefined;

    setImporting(true);
    try {
      const res = await adminApi.startImport({
        folderPath: folderPath.trim(),
        genre: genreVal,
        year: yearVal,
      });

      if (res.data.success) {
        const importId = res.data.data.importId;
        toast.success(t('admin.import_started'));

        const es = new EventSource(adminApi.getImportProgress(importId));
        eventSourceRef.current = es;

        es.onmessage = (event) => {
          try {
            const data: ImportProgress = JSON.parse(event.data);
            setProgress(data);
            if (data.status === 'completed') {
              es.close();
              setImporting(false);
              toast.success(t('admin.import_completed'));
            } else if (data.status === 'error') {
              es.close();
              setImporting(false);
              toast.error(`${t('admin.import_error')}: ${data.errors.join(', ')}`);
            }
          } catch {}
        };

        es.onerror = () => {
          es.close();
          setImporting(false);
        };
      }
    } catch (err: any) {
      toast.error(t('admin.import_start_failed'));
      setImporting(false);
    }
  };

  const toggleSeries = (name: string) => {
    setSelectedSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (!scanned) return;
    if (selectedSeries.size === scanned.series.length) {
      setSelectedSeries(new Set());
    } else {
      setSelectedSeries(new Set(scanned.series.map(s => s.name)));
    }
  };

  const filteredSeries = scanned?.series.filter(s => selectedSeries.has(s.name)) || [];
  const progressPct = progress ? (progress.totalEpisodes > 0 ? Math.round((progress.processedEpisodes / progress.totalEpisodes) * 100) : 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('admin.import_series')}</h1>
        <p className="text-sm text-gray-400 mt-1">{t('admin.import_desc')}</p>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <HiFolderOpen className="w-5 h-5 text-[#E50914]" />
          {t('admin.select_folder')}
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder={t('admin.folder_placeholder')}
            className="flex-1 bg-[#222] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914] transition-colors"
          />
          <button
            onClick={handleScan}
            disabled={scanning || !folderPath.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#E50914] hover:bg-[#f40612] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
          >
            {scanning ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <HiMagnifyingGlass className="w-5 h-5" />
            )}
            {scanning ? t('admin.scanning') : t('admin.scan')}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t('admin.expected_structure')}
        </p>
      </div>

      {scanned && scanned.totalSeries > 0 && !importing && !progress && (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4">{t('admin.options')}</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-400 mb-1 block">{t('admin.genre_optional')}</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-[#222] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#E50914] transition-colors"
              >
                <option value="">{t('admin.select_option')}</option>
                <option value="Aksiyon">Aksiyon</option>
                <option value="Drama">Drama</option>
                <option value="Komedi">Komedi</option>
                <option value="Gerilim">Gerilim</option>
                <option value="Korku">Korku</option>
                <option value="Bilim Kurgu">Bilim Kurgu</option>
                <option value="Romantik">Romantik</option>
                <option value="Polisiye">Polisiye</option>
                <option value="Tarih">Tarih</option>
                <option value="Savaş">Savaş</option>
                <option value="Belgesel">Belgesel</option>
                <option value="Animasyon">Animasyon</option>
              </select>
            </div>
            <div className="w-full md:w-40">
              <label className="text-sm text-gray-400 mb-1 block">{t('admin.year_optional')}</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                min="1900"
                max="2030"
                className="w-full bg-[#222] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914] transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {scanned && scanned.totalSeries > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <HiTv className="w-5 h-5 text-[#E50914]" />
              {t('admin.found_series')} ({filteredSeries.length}/{scanned.totalSeries})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {selectedSeries.size === scanned.series.length ? t('admin.deselect_all') : t('admin.select_all_series')}
              </button>
              <button
                onClick={handleImport}
                disabled={importing || filteredSeries.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-[#f40612] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-sm"
              >
                <HiArrowDownTray className="w-4 h-4" />
                {t('admin.import_count')} ({filteredSeries.length} {t('admin.series_label')})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: t('admin.total_series_count'), value: filteredSeries.length, icon: HiTv, color: 'text-blue-400' },
              { label: t('admin.total_seasons'), value: filteredSeries.reduce((s, se) => s + se.seasons.length, 0), icon: HiFilm, color: 'text-green-400' },
              { label: t('admin.total_episodes'), value: filteredSeries.reduce((s, se) => s + se.totalEpisodes, 0), icon: HiServerStack, color: 'text-yellow-400' },
              { label: t('common.status'), value: importing ? t('admin.importing_status') : t('admin.ready_status'), icon: importing ? HiClock : HiCheckCircle, color: importing ? 'text-orange-400' : 'text-green-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#222] rounded-lg p-3 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {scanned.series.map((series) => (
              <div
                key={series.name}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedSeries.has(series.name)
                    ? 'bg-[#E50914]/5 border-[#E50914]/30'
                    : 'bg-[#222] border-white/5 opacity-50'
                }`}
                onClick={() => toggleSeries(series.name)}
              >
                <input
                  type="checkbox"
                  checked={selectedSeries.has(series.name)}
                  onChange={() => toggleSeries(series.name)}
                  className="w-4 h-4 accent-[#E50914] rounded"
                />
                <HiTv className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{series.name}</p>
                  <p className="text-xs text-gray-500">
                    {series.seasons.length} {t('admin.seasons_label')}, {series.totalEpisodes} {t('admin.episodes_label')}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {series.seasons.map((s) => (
                    <span key={s.number} className="text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded">
                      S{s.number}: {s.episodes.length}b
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scanned && scanned.totalSeries === 0 && (
        <div className="bg-[#1a1a1a] rounded-xl p-10 border border-white/5 text-center">
          <HiExclamationTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400 text-lg">{t('admin.no_series_found')}</p>
          <p className="text-gray-500 text-sm mt-1">
            {t('admin.folder_structure_hint')}<br />
            <code className="bg-[#222] px-2 py-0.5 rounded text-gray-300 mt-1 inline-block">
              Diziler/DiziAdi/Sezon 1/Bölüm 1.mp4
            </code>
          </p>
        </div>
      )}

      {progress && (
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {progress.status === 'completed' ? (
              <HiCheckCircle className="w-5 h-5 text-green-400" />
            ) : progress.status === 'error' ? (
              <HiXCircle className="w-5 h-5 text-red-400" />
            ) : (
              <div className="w-5 h-5 border-2 border-white/30 border-t-[#E50914] rounded-full animate-spin" />
            )}
            {t('admin.import_status')} {progress.status === 'completed' ? t('admin.completed_label') : progress.status === 'error' ? t('admin.error_label') : t('admin.in_progress')}
          </h2>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">
                {progress.processedSeries}/{progress.totalSeries} {t('admin.series_label')}
              </span>
              <span className="text-white font-medium">{progressPct}%</span>
            </div>
            <div className="w-full h-3 bg-[#222] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#E50914] to-[#ff4d55] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#222] rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500">{t('admin.series_label')}</p>
              <p className="text-white font-semibold">{progress.processedSeries}/{progress.totalSeries}</p>
            </div>
            <div className="bg-[#222] rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500">{t('admin.episode_label')}</p>
              <p className="text-white font-semibold">{progress.processedEpisodes}/{progress.totalEpisodes}</p>
            </div>
            <div className="bg-[#222] rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500">{t('admin.size_label')}</p>
              <p className="text-white font-semibold">{formatBytes(progress.copiedSize)}</p>
            </div>
            <div className="bg-[#222] rounded-lg p-3 border border-white/5">
              <p className="text-xs text-gray-500">{t('admin.current_label')}</p>
              <p className="text-white font-semibold">{progress.currentSeries || '-'}</p>
            </div>
          </div>

          {progress.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm font-medium mb-2">{t('admin.errors_label')} ({progress.errors.length})</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-300/80">{err}</p>
                ))}
              </div>
            </div>
          )}

          {progress.completedAt && (
            <p className="text-xs text-gray-500 mt-3">
              {t('admin.duration_label')}: {formatDuration((new Date(progress.completedAt).getTime() - new Date(progress.startedAt).getTime()) / 1000)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
