'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChatBubbleLeftEllipsis, HiOutlineExclamationTriangle, HiTrash } from 'react-icons/hi2';
import { useTranslation } from '@/i18n';
import api from '@/lib/api';
import { Comment } from '@/types';

interface CommentSectionProps {
  contentId: string;
  episodeId?: string;
  currentUserId?: string;
}

const EMOJI_MAP: Record<string, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😠',
};

export default function CommentSection({ contentId, episodeId, currentUserId }: CommentSectionProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [contentId, episodeId]);

  const fetchComments = async () => {
    try {
      const params = episodeId ? `?episodeId=${episodeId}` : '';
      const res = await api.get(`/social/${contentId}${params}`);
      setComments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/social', {
        contentId,
        episodeId: episodeId || undefined,
        text: newComment.trim(),
        hasSpoiler,
      });
      setComments((prev) => [res.data.data, ...prev]);
      setNewComment('');
      setHasSpoiler(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Yorum eklenemedi';
      if (err.response?.status === 403) {
        alert(msg);
        fetchComments();
      } else {
        alert(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/social/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete comment');
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      await api.post('/social/reactions/toggle', { commentId, emoji });
      fetchComments();
    } catch (err) {
      console.error('Reaction failed');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
    return d.toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="space-y-4 mt-6">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" /> {t('social.comments')}
        </h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-800/50 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-zinc-700 rounded-full" />
              <div className="h-4 bg-zinc-700 rounded w-24" />
            </div>
            <div className="h-3 bg-zinc-700 rounded w-full mb-2" />
            <div className="h-3 bg-zinc-700 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const myCommentCount = comments.filter((c) => c.userId === currentUserId).length;
  const commentLimitReached = currentUserId && myCommentCount >= 3;

  return (
    <div className="mt-6">
      <h3 className="text-white text-lg font-semibold flex items-center gap-2 mb-4">
        <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5" />
        {t('social.comments')} ({comments.length})
      </h3>

      {!commentLimitReached && (
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('social.add_comment')}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 transition"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <button
            type="button"
            onClick={() => setHasSpoiler(!hasSpoiler)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition ${
              hasSpoiler ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />
            {t('social.spoiler')}
          </button>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm px-4 py-1.5 rounded-lg transition"
          >
            {submitting ? '...' : t('social.add_comment')}
          </button>
        </div>
      </form>
      )}

      {commentLimitReached && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm flex items-center gap-2">
          <HiOutlineExclamationTriangle className="w-4 h-4 flex-shrink-0" />
          {t('social.comment_limit_reached') || 'Bu icerik icin en fazla 3 yorum yazabilirsiniz'}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {comments.length === 0 ? (
          <div className="text-center py-10 text-zinc-500">
            <HiOutlineChatBubbleLeftEllipsis className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('social.no_comments')}</p>
          </div>
        ) : (
          comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mb-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {comment.user?.avatar ? (
                    <img src={comment.user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center text-xs text-white">
                      {(comment.user?.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">
                    {comment.user?.displayName || comment.user?.username || 'Anonim'}
                  </span>
                  <span className="text-zinc-500 text-xs">{formatDate(comment.createdAt)}</span>
                </div>
                {(currentUserId === comment.userId) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-zinc-500 hover:text-red-400 transition p-1"
                    title={t('social.delete')}
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                )}
              </div>

              {comment.hasSpoiler && (
                <div className="bg-red-500/10 border border-red-500/20 rounded px-2 py-1 mb-2 text-xs text-red-400 flex items-center gap-1">
                  <HiOutlineExclamationTriangle className="w-3 h-3" />
                  {t('social.spoiler_warning')}
                </div>
              )}

              <p className="text-zinc-300 text-sm leading-relaxed">{comment.text}</p>

              <div className="flex items-center gap-1 mt-3">
                {Object.entries(EMOJI_MAP).map(([key, emoji]) => {
                  const count = comment.reactions?.filter((r) => r.emoji === key).length || 0;
                  const hasReacted = comment.reactions?.some(
                    (r) => r.emoji === key && r.userId === currentUserId
                  );
                  return (
                    <button
                      key={key}
                      onClick={() => handleReaction(comment.id, key)}
                      className={`flex items-center gap-0.5 text-xs px-2 py-1 rounded-full transition ${
                        hasReacted
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'bg-zinc-700/50 border border-zinc-700 hover:bg-zinc-700'
                      }`}
                      title={t(`social.${key}`)}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-zinc-400">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
