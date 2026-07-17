'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUserGroup,
  HiOutlineLink,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineArrowRightOnRectangle,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { useTranslation } from '@/i18n';
import api from '@/lib/api';
import { WatchParty as WatchPartyType, WatchPartyParticipant } from '@/types';

interface WatchPartyProps {
  contentId: string;
  contentTitle?: string;
  currentUserId: string;
  onSync?: (progress: number, isPlaying: boolean) => void;
}

export default function WatchParty({ contentId, contentTitle, currentUserId, onSync }: WatchPartyProps) {
  const { t } = useTranslation();
  const [party, setParty] = useState<WatchPartyType | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ userId: string; text: string; time: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const createParty = async () => {
    setLoading(true);
    try {
      const res = await api.post('/social/party/create', { contentId });
      setParty(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Parti oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const joinParty = async (partyId: string) => {
    setLoading(true);
    try {
      const res = await api.post(`/social/party/${partyId}/join`);
      setParty((prev) =>
        prev
          ? { ...prev, participants: [...(prev.participants || []), res.data.data] }
          : prev
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Partye katılınamadı');
    } finally {
      setLoading(false);
    }
  };

  const leaveParty = async () => {
    if (!party) return;
    try {
      await api.post(`/social/party/${party.id}/leave`);
      setParty(null);
    } catch (err) {
      console.error('Failed to leave party');
    }
  };

  const endParty = async () => {
    if (!party || party.hostId !== currentUserId) return;
    try {
      await api.post(`/social/party/${party.id}/leave`);
      setParty(null);
    } catch (err) {
      console.error('Failed to end party');
    }
  };

  const syncPlayback = async (isPlaying: boolean, progress: number) => {
    if (!party || party.hostId !== currentUserId) return;
    try {
      await api.post(`/social/party/${party.id}/sync`, { isPlaying, progress });
      onSync?.(progress, isPlaying);
    } catch (err) {
      console.error('Sync failed');
    }
  };

  const copyInviteLink = () => {
    if (!party) return;
    const link = `${window.location.origin}/watch-party/${party.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { userId: currentUserId, text: chatMessage.trim(), time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setChatMessage('');
  };

  const isHost = party?.hostId === currentUserId;
  const participantCount = party?.participants?.length || 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HiOutlineUserGroup className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">{t('social.watch_party')}</h3>
        </div>
        {party && (
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${party.isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${party.isActive ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
            {party.isActive ? 'Canlı' : 'Bitti'}
          </div>
        )}
      </div>

      {!party ? (
        <div className="text-center py-6">
          <p className="text-zinc-400 text-sm mb-4">
            {contentTitle ? `"${contentTitle}" için parti oluştur` : 'Arkadaşlarınla birlikte izle'}
          </p>
          <button
            onClick={createParty}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
          >
            {loading ? '...' : t('social.create_party')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition border border-zinc-700"
            >
              <HiOutlineLink className="w-3.5 h-3.5" />
              {copied ? t('social.link_copied') : t('social.invite_link')}
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition border ${
                chatOpen ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" />
              {t('social.party_chat')}
            </button>
          </div>

          <div>
            <p className="text-zinc-500 text-xs mb-2">{t('social.participants')} ({participantCount})</p>
            <div className="flex flex-wrap gap-2">
              {party.participants?.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-full text-xs"
                >
                  {p.user?.avatar ? (
                    <img src={p.user.avatar} alt="" className="w-4 h-4 rounded-full" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-zinc-600 flex items-center justify-center text-[8px] text-white">
                      {(p.user?.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-zinc-300">{p.user?.displayName || p.user?.username}</span>
                  {p.userId === party.hostId && (
                    <span className="text-yellow-500 text-[10px]">{t('social.host')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => syncPlayback(true, 0)}
                className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs px-3 py-1.5 rounded-lg transition border border-green-600/30"
              >
                <HiOutlinePlay className="w-3.5 h-3.5" />
                {t('social.sync_playback')}
              </button>
              <button
                onClick={() => syncPlayback(false, 0)}
                className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition border border-zinc-700"
              >
                <HiOutlinePause className="w-3.5 h-3.5" />
                Duraklat
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={leaveParty}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs px-3 py-1.5 rounded-lg transition border border-zinc-700"
            >
              <HiOutlineArrowRightOnRectangle className="w-3.5 h-3.5" />
              {t('social.leave_party')}
            </button>
            {isHost && (
              <button
                onClick={endParty}
                className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg transition border border-red-500/20"
              >
                <HiOutlineTrash className="w-3.5 h-3.5" />
                Partiyi Sonlandır
              </button>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {chatOpen && party && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4 border-t border-zinc-800 pt-4"
          >
            <div className="h-48 overflow-y-auto space-y-2 mb-3 scrollbar-hide">
              {chatMessages.length === 0 ? (
                <p className="text-zinc-600 text-xs text-center py-8">Henüz mesaj yok</p>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.userId === currentUserId ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] px-3 py-1.5 rounded-lg text-xs ${
                        msg.userId === currentUserId
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="text-[10px] opacity-50">{msg.time}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChatMessage} className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Mesaj yaz..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
              >
                Gönder
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
