'use client';

import { useState, useEffect, useCallback } from 'react';
import { socialApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  HiMagnifyingGlass, HiChatBubbleLeftEllipsis, HiTrash, HiExclamationTriangle,
  HiArrowPath, HiUser, HiCalendarDays, HiEye, HiChevronLeft, HiChevronRight,
  HiDocumentText, HiShieldExclamation, HiFire,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface AdminComment {
  id: string;
  text: string;
  hasSpoiler: boolean;
  isDeleted: boolean;
  createdAt: string;
  user: { id: string; username: string; email: string; displayName?: string; avatar?: string };
  content: { id: string; title: string; type: string; poster?: string };
  episode?: { id: string; title: string; episodeNumber: number };
}

interface CommentStats {
  total: number;
  deleted: number;
  spoilers: number;
  today: number;
}

export default function AdminCommentsPage() {
  const { t } = useTranslation();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommentStats>({ total: 0, deleted: 0, spoilers: 0, today: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ comment: AdminComment; hard: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadComments();
    loadStats();
  }, [page]);

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => loadComments(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      const res = await socialApi.adminGetComments(params);
      if (res.data.success) {
        setComments(res.data.data?.comments || res.data.data || []);
        setTotalPages(res.data.data?.totalPages || 1);
      }
    } catch {
      toast.error('Yorumlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await socialApi.adminCommentStats();
      if (res.data.success) {
        setStats(res.data.data || { total: 0, deleted: 0, spoilers: 0, today: 0 });
      }
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    try {
      if (deleteModal.hard) {
        await socialApi.adminHardDeleteComment(deleteModal.comment.id);
        toast.success('Yorum kalici olarak silindi');
      } else {
        await socialApi.adminDeleteComment(deleteModal.comment.id);
        toast.success('Yorum silindi');
      }
      setDeleteModal(null);
      loadComments();
      loadStats();
    } catch {
      toast.error('Islem basarisiz');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getInitial = (name: string) => name?.charAt(0).toUpperCase() || '?';

  const statCards = [
    { label: t('admin.comment_total'), value: stats.total, icon: HiChatBubbleLeftEllipsis, color: 'text-blue-400', bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20' },
    { label: t('admin.comment_deleted'), value: stats.deleted, icon: HiTrash, color: 'text-red-400', bg: 'from-red-500/10 to-red-500/5', border: 'border-red-500/20' },
    { label: t('admin.comment_spoilers'), value: stats.spoilers, icon: HiShieldExclamation, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20' },
    { label: t('admin.comment_today'), value: stats.today, icon: HiFire, color: 'text-green-400', bg: 'from-green-500/10 to-green-500/5', border: 'border-green-500/20' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.comments')}</h1>
          <p className="text-sm text-[#808080] mt-1">{stats.total} toplam yorum</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadComments} className="p-2 rounded-lg bg-white/[0.06] text-[#808080] hover:text-white transition-colors">
            <HiArrowPath className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-br ${s.bg} border ${s.border} rounded-xl p-4`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/[0.06]`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-[#808080]">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('admin.comment_search')}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]/50 transition-colors"
        />
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/[0.03] rounded-xl border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16">
          <HiChatBubbleLeftEllipsis className="w-12 h-12 text-[#333] mx-auto mb-3" />
          <p className="text-[#555]">Yorum bulunamadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {comments.map((comment, i) => {
              const isExpanded = expandedId === comment.id;
              const isLong = comment.text.length > 150;
              const contentPath = comment.content?.type === 'MOVIE'
                ? `/movie/${comment.content.id}`
                : `/series/${comment.content.id}`;

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* User */}
                    <div className="flex items-center gap-3 min-w-0 flex-shrink-0 md:w-56">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E50914]/20 to-[#E50914]/5 border border-[#E50914]/10 flex items-center justify-center shrink-0">
                        {comment.user?.avatar ? (
                          <img src={comment.user.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-[#E50914]">{getInitial(comment.user?.username)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{comment.user?.displayName || comment.user?.username || 'Bilinmiyor'}</p>
                        <p className="text-xs text-[#808080] truncate">{comment.user?.email}</p>
                      </div>
                    </div>

                    {/* Comment text + content info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm text-[#ccc] leading-relaxed ${!isExpanded && isLong ? 'line-clamp-2' : ''} ${isLong ? 'cursor-pointer hover:text-white transition-colors' : ''}`}
                        onClick={() => isLong && setExpandedId(isExpanded ? null : comment.id)}
                        title={isExpanded ? undefined : 'Tamami icin tikla'}
                      >
                        {comment.text}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Content link */}
                        <Link
                          href={contentPath}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.06] text-[11px] text-[#808080] hover:text-white hover:bg-white/[0.1] transition-colors"
                        >
                          <HiDocumentText className="w-3 h-3" />
                          {comment.content?.title || 'Bilinmeyen'}
                          {comment.episode && <span className="text-[#555]"> &middot; S{comment.episode.episodeNumber}</span>}
                        </Link>

                        {/* Spoiler badge */}
                        {comment.hasSpoiler && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                            <HiShieldExclamation className="w-3 h-3" />
                            {t('admin.comment_spoiler_badge')}
                          </span>
                        )}

                        {/* Date */}
                        <span className="text-[11px] text-[#555] flex items-center gap-1">
                          <HiCalendarDays className="w-3 h-3" />
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={contentPath}
                        className="p-2 rounded-lg bg-white/[0.06] text-[#808080] hover:text-white hover:bg-white/[0.1] transition-colors"
                        title={t('admin.comment_view_content')}
                      >
                        <HiEye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ comment, hard: false })}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title={t('admin.comment_delete')}
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ comment, hard: true })}
                        className="p-2 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-colors"
                        title={t('admin.comment_delete_hard')}
                      >
                        <HiExclamationTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-white/[0.06] text-[#808080] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <HiChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[#808080] px-3">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-white/[0.06] text-[#808080] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <HiChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#1a1a1a] border border-white/[0.06] rounded-xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-1">
                {deleteModal.hard ? t('admin.comment_delete_hard') : t('admin.comment_delete')}
              </h3>
              <p className="text-sm text-[#808080] mb-4">
                {deleteModal.comment.user?.username} &middot; {deleteModal.comment.content?.title}
              </p>

              <div className={`flex items-start gap-3 rounded-lg p-3 mb-4 ${
                deleteModal.hard
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                <HiExclamationTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${deleteModal.hard ? 'text-red-400' : 'text-amber-400'}`} />
                <p className={`text-sm ${deleteModal.hard ? 'text-red-400' : 'text-amber-400'}`}>
                  {deleteModal.hard
                    ? t('admin.comment_delete_hard_confirm')
                    : t('admin.comment_delete_confirm')
                  }
                </p>
              </div>

              <div className="bg-white/[0.03] rounded-lg p-3 mb-4">
                <p className="text-xs text-[#808080] line-clamp-3">{deleteModal.comment.text}</p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 rounded-lg text-sm text-[#808080] hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Iptal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    deleteModal.hard ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? '...' : deleteModal.hard ? t('admin.comment_delete_hard') : t('admin.comment_delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
