import prisma from '../config/database';
import { slugify } from '../utils/helpers';

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

const progressMap = new Map<string, ImportProgress>();

export function getProgress(id: string): ImportProgress | undefined {
  return progressMap.get(id);
}

export async function scanFolder(_folderPath: string): Promise<any[]> {
  throw new Error('Dosya sistemi tarama serverless modda desteklenmiyor. İçeriği manuel olarak ekleyin.');
}

export async function importSeries(
  _folderPath: string,
  importId: string,
  _options: { genre?: string; year?: number } = {}
): Promise<void> {
  const progress: ImportProgress = {
    id: importId,
    status: 'error',
    totalSeries: 0,
    processedSeries: 0,
    currentSeries: '',
    totalEpisodes: 0,
    processedEpisodes: 0,
    totalSize: 0,
    copiedSize: 0,
    errors: ['Dosya içe aktarma serverless modda desteklenmiyor. İçeriği admin panelinden manuel olarak ekleyin.'],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  progressMap.set(importId, progress);
}
