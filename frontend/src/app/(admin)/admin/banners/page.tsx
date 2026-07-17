'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Banner } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiPlus, HiPencil, HiTrash, HiXMark, HiPhoto, HiLink, HiExclamationTriangle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminBanners() {
  const { t } = useTranslation();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', image: '', link: '', active: true });

  useEffect(() => { loadBanners(); }, []);

  const loadBanners = async () => {
    try {
      const res = await adminApi.getBanners();
      if (res.data.success) setBanners(res.data.data || []);
    } catch { toast.error(t('admin.banners_load_error')); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setForm({ title: '', image: '', link: '', active: true });
    setEditId(null); setShowDrawer(true);
  };

  const openEdit = (banner: Banner) => {
    setForm({ title: banner.title || '', image: banner.image || '', link: banner.link || '', active: banner.active });
    setEditId(banner.id); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.image.trim()) { toast.error(t('admin.banner_image_required')); return; }
    try {
      if (editId) { await adminApi.updateBanner(editId, form); toast.success(t('admin.banner_updated')); }
      else { await adminApi.createBanner(form); toast.success(t('admin.banner_created')); }
      setShowDrawer(false); loadBanners();
    } catch { toast.error(t('admin.action_failed')); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await adminApi.deleteBanner(deleteId); toast.success(t('admin.banner_deleted')); setDeleteId(null); loadBanners(); }
    catch { toast.error(t('admin.delete_failed')); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.banner_management')}</h1>
          <p className="text-sm text-gray-600 mt-1">{banners.length} {t('common.total')}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> {t('admin.new_banner')}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && banners.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiPhoto className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_banners_yet')}</h3>
          <p className="text-sm text-gray-600">{t('admin.create_first_banner')}</p>
        </div>
      )}

      {!loading && banners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden hover:border-white/[0.08] transition-all">
              <div className="relative aspect-video bg-black/40">
                {banner.image ? (
                  <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <HiPhoto className="w-10 h-10 text-gray-700" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${banner.active ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-gray-500/20 text-gray-400 border border-gray-500/20'}`}>
                    {banner.active ? t('common.active') : t('common.passive')}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-0.5">{banner.title || t('admin.no_title')}</h3>
                    {banner.link && (
                      <p className="text-[11px] text-gray-600 flex items-center gap-1 truncate max-w-[250px]">
                        <HiLink className="w-3 h-3 shrink-0" />
                        {banner.link}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.04]">
                  <button onClick={() => openEdit(banner)} className="flex-1 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">{t('common.edit')}</button>
                  <button onClick={() => setDeleteId(banner.id)} className="flex-1 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">{t('common.delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editId ? t('admin.edit_banner') : t('admin.new_banner')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.title')}</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder={t('admin.banner_title_placeholder')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.image_url')} *</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
                {form.image && <img src={form.image} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.link_url')}</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[11px] text-gray-600 uppercase tracking-wider font-medium">{t('admin.status')}</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-[#E50914]' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.active ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-xs text-gray-500">{form.active ? t('common.active') : t('common.passive')}</span>
              </div>
            </div>

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

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
                <HiExclamationTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{t('admin.delete_banner')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">{t('admin.delete_banner_confirm')}</p>
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
      `}</style>
    </div>
  );
}
