'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { Category } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiPlus, HiPencil, HiTrash, HiXMark, HiChevronUp, HiChevronDown,
  HiExclamationTriangle, HiTag, HiArrowUpRight, HiPhoto,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', image: '', sortOrder: 0 });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const res = await adminApi.getCategories();
      if (res.data.success) {
        const sorted = (res.data.data || []).sort((a: Category, b: Category) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(sorted);
      }
    } catch { toast.error(t('admin.categories_load_error')); }
    finally { setLoading(false); }
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');

  const openCreate = () => {
    setForm({ name: '', slug: '', description: '', image: '', sortOrder: categories.length + 1 });
    setEditId(null); setShowDrawer(true);
  };

  const openEdit = (cat: Category) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', image: cat.image || '', sortOrder: cat.sortOrder });
    setEditId(cat.id); setShowDrawer(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t('admin.category_name_required')); return; }
    const data = { ...form, sortOrder: Number(form.sortOrder) };
    try {
      if (editId) { await adminApi.updateCategory(editId, data); toast.success(t('admin.category_updated')); }
      else { await adminApi.createCategory(data); toast.success(t('admin.category_created')); }
      setShowDrawer(false); loadCategories();
    } catch { toast.error(t('admin.action_failed')); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await adminApi.deleteCategory(deleteId); toast.success(t('admin.category_deleted')); setDeleteId(null); loadCategories(); }
    catch { toast.error(t('admin.delete_failed')); }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const items = [...categories];
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    items.forEach((item, i) => { item.sortOrder = i + 1; });
    setCategories(items);
    try {
      await adminApi.updateCategory(items[index - 1].id, { sortOrder: items[index - 1].sortOrder });
      await adminApi.updateCategory(items[index].id, { sortOrder: items[index].sortOrder });
    } catch {}
  };

  const moveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const items = [...categories];
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    items.forEach((item, i) => { item.sortOrder = i + 1; });
    setCategories(items);
    try {
      await adminApi.updateCategory(items[index + 1].id, { sortOrder: items[index + 1].sortOrder });
      await adminApi.updateCategory(items[index].id, { sortOrder: items[index].sortOrder });
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.category_management')}</h1>
          <p className="text-sm text-gray-600 mt-1">{categories.length} {t('common.total')}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiPlus className="w-4 h-4" /> {t('admin.new_category')}
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiTag className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.no_categories_yet')}</h3>
          <p className="text-sm text-gray-600 mb-4">{t('admin.create_first_category')}</p>
          <button onClick={openCreate} className="text-sm text-[#E50914] hover:underline">{t('admin.create_category_link')}</button>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, index) => (
            <div key={cat.id} className="group relative rounded-2xl bg-white/[0.02] border border-white/[0.04] p-5 hover:border-white/[0.08] transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E50914]/10 to-[#E50914]/5 border border-[#E50914]/10 flex items-center justify-center shrink-0">
                  {cat.image ? (
                    <img src={cat.image} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-lg font-bold text-[#E50914]/60">{cat.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{cat.name}</h3>
                    <span className="text-[10px] text-gray-600 font-mono px-1.5 py-0.5 bg-white/[0.04] rounded">#{cat.sortOrder}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-mono mt-0.5">{cat.slug}</p>
                  {cat.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.description}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => moveUp(index)} disabled={index === 0} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 transition-all"><HiChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveDown(index)} disabled={index === categories.length - 1} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg disabled:opacity-30 transition-all"><HiChevronDown className="w-4 h-4" /></button>
                <div className="flex-1" />
                <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"><HiPencil className="w-4 h-4" /></button>
                <button onClick={() => setDeleteId(cat.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><HiTrash className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-semibold text-white">{editId ? t('admin.edit_category') : t('admin.new_category')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.category_name')} *</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" placeholder={t('admin.category_name')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: editId ? f.slug : generateSlug(e.target.value) }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">Slug</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="kategori-slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.description')}</label>
                <textarea className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 resize-none h-20" placeholder={t('admin.description') + '...'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.image_url')}</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50" placeholder="https://..." value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} />
                {form.image && <img src={form.image} alt="" className="mt-2 h-16 rounded-lg object-cover" />}
              </div>
              <div>
                <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.sort_order')}</label>
                <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
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
              <h3 className="text-lg font-semibold text-white">{t('admin.delete_category')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">{t('admin.delete_category_confirm')}</p>
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
