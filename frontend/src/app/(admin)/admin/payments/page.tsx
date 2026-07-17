'use client';

import { useState, useEffect } from 'react';
import { ibanPaymentApi } from '@/lib/api';
import { IbanPayment } from '@/types';
import { useTranslation } from '@/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMagnifyingGlass, HiCheckCircle, HiXCircle, HiClock, HiEye,
  HiUser, HiCalendarDays, HiTrash,
  HiExclamationTriangle, HiArrowPath,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const statusFilters = ['ALL', 'PENDING', 'RECEIVED', 'APPROVED', 'REJECTED'] as const;

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  RECEIVED: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  APPROVED: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

const statusLabels: Record<string, string> = {
  ALL: 'Tumu',
  PENDING: 'Beklemede',
  RECEIVED: 'Dekont Yuklendi',
  APPROVED: 'Onaylandi',
  REJECTED: 'Reddedildi',
};

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<IbanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'delete' | 'bulkDelete'; payment?: IbanPayment } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  useEffect(() => { loadPayments(); }, [statusFilter]);

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(() => { loadPayments(); }, 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await ibanPaymentApi.adminGetAll(params);
      if (res.data.success) {
        setPayments(res.data.data?.payments || res.data.data || []);
      }
    } catch { toast.error('Odeme yuklenemedi'); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      if (actionModal.type === 'approve' && actionModal.payment) {
        await ibanPaymentApi.adminApprove(actionModal.payment.id, actionNote || undefined);
        toast.success('Odeme onaylandi');
      } else if (actionModal.type === 'reject' && actionModal.payment) {
        await ibanPaymentApi.adminReject(actionModal.payment.id, actionNote || undefined);
        toast.success('Odeme reddedildi');
      } else if (actionModal.type === 'delete' && actionModal.payment) {
        await ibanPaymentApi.adminDelete(actionModal.payment.id);
        toast.success('Odeme silindi');
      } else if (actionModal.type === 'bulkDelete') {
        const ids = Array.from(selectedIds);
        let deleted = 0;
        for (const id of ids) {
          try { await ibanPaymentApi.adminDelete(id); deleted++; } catch {}
        }
        toast.success(`${deleted} odeme silindi`);
        setSelectedIds(new Set());
        setSelectMode(false);
      }
      setActionModal(null);
      setActionNote('');
      loadPayments();
    } catch { toast.error('Islem basarisiz'); }
    finally { setActionLoading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.user?.email?.toLowerCase().includes(q) ||
      p.user?.username?.toLowerCase().includes(q) ||
      p.paymentCode?.toLowerCase().includes(q) ||
      p.packageName?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.payment_approvals')}</h1>
          <p className="text-sm text-[#808080] mt-1">{payments.length} toplam odeme</p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={() => setActionModal({ type: 'bulkDelete' })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors"
            >
              <HiTrash className="w-4 h-4" />
              Sil ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectMode ? 'bg-[#E50914]/20 text-[#E50914]' : 'bg-white/[0.06] text-[#808080] hover:text-white'
            }`}
          >
            {selectMode ? 'Secimi Kaldir' : 'Sec'}
          </button>
          <button
            onClick={loadPayments}
            className="p-2 rounded-lg bg-white/[0.06] text-[#808080] hover:text-white transition-colors"
          >
            <HiArrowPath className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {statusFilters.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-[#E50914] text-white'
                  : 'text-[#808080] hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="E-posta, kullanici, kod ara..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]/50 transition-colors"
          />
        </div>
      </div>

      {/* Select All */}
      {selectMode && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-[#808080] hover:text-white transition-colors"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              selectedIds.size === filtered.length ? 'bg-[#E50914] border-[#E50914]' : 'border-white/20'
            }`}>
              {selectedIds.size === filtered.length && <HiCheckCircle className="w-3 h-3 text-white" />}
            </div>
            Tumunu Sec ({filtered.length})
          </button>
        </div>
      )}

      {/* Payment list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/[0.03] rounded-xl border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <HiClock className="w-12 h-12 text-[#333] mx-auto mb-3" />
          <p className="text-[#555]">Odeme bulunamadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((payment, i) => {
              const ss = statusStyles[payment.status] || statusStyles.PENDING;
              const isSelected = selectedIds.has(payment.id);
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => selectMode && toggleSelect(payment.id)}
                  className={`bg-white/[0.03] border rounded-xl p-4 transition-all ${
                    isSelected ? 'border-[#E50914]/50 bg-[#E50914]/5' : 'border-white/[0.06] hover:bg-white/[0.05]'
                  } ${selectMode ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Checkbox + User */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {selectMode && (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-[#E50914] border-[#E50914]' : 'border-white/20'
                        }`}>
                          {isSelected && <HiCheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E50914]/20 to-[#E50914]/5 border border-[#E50914]/10 flex items-center justify-center shrink-0">
                        <HiUser className="w-5 h-5 text-[#E50914]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {payment.user?.displayName || payment.user?.username || 'Bilinmiyor'}
                        </p>
                        <p className="text-xs text-[#808080] truncate">{payment.user?.email}</p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-6 text-sm shrink-0">
                      <div className="text-center">
                        <p className="text-white font-bold">{payment.amount} TL</p>
                        <p className="text-[10px] text-[#555]">{payment.packageName}</p>
                      </div>
                      <div className="text-center hidden sm:block">
                        <p className="text-white font-mono text-xs">{payment.paymentCode}</p>
                        <p className="text-[10px] text-[#555]">Kod</p>
                      </div>
                      <div className="text-center hidden md:block">
                        <p className="text-[#808080] text-xs">{formatDate(payment.createdAt)}</p>
                        <p className="text-[10px] text-[#555]">
                          <HiCalendarDays className="w-3 h-3 inline mr-0.5" />
                          {payment.duration} gun
                        </p>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    {!selectMode && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${ss.bg} ${ss.text} ${ss.border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ss.text.replace('text-', 'bg-')}`} />
                          {statusLabels[payment.status] || payment.status}
                        </span>
                        {payment.receiptUrl && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReceiptPreview(payment.receiptUrl!); }}
                            className="p-2 rounded-lg bg-white/[0.06] text-[#808080] hover:text-white hover:bg-white/[0.1] transition-colors"
                            title="Dekont goruntule"
                          >
                            <HiEye className="w-4 h-4" />
                          </button>
                        )}
                        {(payment.status === 'PENDING' || payment.status === 'RECEIVED') && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'approve', payment }); setActionNote(''); }}
                              className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Onayla"
                            >
                              <HiCheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'reject', payment }); setActionNote(''); }}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Reddet"
                            >
                              <HiXCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'delete', payment }); setActionNote(''); }}
                          className="p-2 rounded-lg bg-white/[0.04] text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Sil"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Action Modal (approve/reject/delete) */}
      <AnimatePresence>
        {actionModal && actionModal.type !== 'bulkDelete' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActionModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#1a1a1a] border border-white/[0.06] rounded-xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-1">
                {actionModal.type === 'approve' && 'Odeme Onayla'}
                {actionModal.type === 'reject' && 'Odeme Reddet'}
                {actionModal.type === 'delete' && 'Odeme Sil'}
              </h3>
              <p className="text-sm text-[#808080] mb-4">
                {actionModal.payment?.user?.email} - {actionModal.payment?.amount} TL - {actionModal.payment?.paymentCode}
              </p>
              {actionModal.type === 'delete' && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <HiExclamationTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">Bu odeme kalici olarak silinecek. Bu islem geri alinamaz.</p>
                </div>
              )}
              {(actionModal.type === 'approve' || actionModal.type === 'reject') && (
                <textarea
                  value={actionNote}
                  onChange={e => setActionNote(e.target.value)}
                  placeholder="Not (opsiyonel)..."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#E50914]/50 transition-colors resize-none mb-4"
                />
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-lg text-sm text-[#808080] hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Iptal
                </button>
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    actionModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700'
                      : actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-red-600 hover:bg-red-700'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? '...' : actionModal.type === 'approve' ? 'Onayla' : actionModal.type === 'reject' ? 'Reddet' : 'Sil'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Modal */}
      <AnimatePresence>
        {actionModal && actionModal.type === 'bulkDelete' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActionModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#1a1a1a] border border-white/[0.06] rounded-xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-1">Toplu Sil</h3>
              <p className="text-sm text-[#808080] mb-4">{selectedIds.size} odeme silinecek.</p>
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <HiExclamationTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">Secili tum odemeler kalici olarak silinecek. Bu islem geri alinamaz.</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-lg text-sm text-[#808080] hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  Iptal
                </button>
                <button
                  onClick={handleAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? '...' : `${selectedIds.size} Odeme Sil`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {receiptPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setReceiptPreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-2xl max-h-[80vh] rounded-xl overflow-hidden border border-white/[0.06]"
            >
              <img
                src={receiptPreview}
                alt="Dekont"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const msg = document.createElement('div');
                    msg.className = 'flex flex-col items-center justify-center p-8 bg-[#111] text-[#555]';
                    msg.innerHTML = '<p class="text-lg mb-2">Dekont yuklenemedi</p><p class="text-xs">' + receiptPreview + '</p>';
                    parent.appendChild(msg);
                  }
                }}
              />
              <button
                onClick={() => setReceiptPreview(null)}
                className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <HiXCircle className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
