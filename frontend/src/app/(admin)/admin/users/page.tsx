'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import { useTranslation } from '@/i18n';
import {
  HiMagnifyingGlass, HiPlus, HiPencil, HiTrash,
  HiNoSymbol, HiCheck, HiKey, HiChevronLeft, HiChevronRight,
  HiShieldCheck, HiXMark, HiSquares2X2, HiListBullet,
  HiExclamationTriangle, HiUserPlus, HiEnvelope, HiCalendarDays,
  HiMagnifyingGlassCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showDrawer, setShowDrawer] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [banModal, setBanModal] = useState<{ id: string; isBanned: boolean } | null>(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', displayName: '', role: 'USER', isVerified: false });
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', username: '' });

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page, limit: 20, search });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch { toast.error(t('admin.users_load_error')); }
    finally { setLoading(false); }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ username: u.username, email: u.email, displayName: u.displayName || '', role: u.role, isVerified: u.isVerified });
    setShowDrawer(true);
  };

  const openCreateAdmin = () => {
    setEditUser(null);
    setNewAdmin({ email: '', password: '', username: '' });
    setShowDrawer(true);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    try {
      await adminApi.updateUser(editUser.id, editForm);
      toast.success(t('admin.user_updated'));
      setShowDrawer(false);
      loadUsers();
    } catch { toast.error(t('admin.update_failed')); }
  };

  const createAdmin = async () => {
    try {
      await adminApi.createAdmin(newAdmin);
      toast.success(t('admin.admin_created'));
      setShowDrawer(false);
      loadUsers();
    } catch { toast.error(t('admin.admin_create_failed')); }
  };

  const handleBan = async () => {
    if (!banModal) return;
    try {
      const res = banModal.isBanned ? await adminApi.unbanUser(banModal.id) : await adminApi.banUser(banModal.id);
      if (res.data.success) {
        toast.success(banModal.isBanned ? t('admin.ban_removed') : t('admin.user_banned'));
        setBanModal(null);
        loadUsers();
      }
    } catch { toast.error(t('admin.action_failed')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteUser(id);
      toast.success(t('admin.user_deleted'));
      setDeleteId(null);
      loadUsers();
    } catch { toast.error(t('admin.delete_failed')); }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await adminApi.resetUserPassword(id);
      toast.success(t('admin.password_reset'));
    } catch { toast.error(t('admin.password_reset_failed')); }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      SUPER_ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
      ADMIN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      USER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return styles[role] || styles.USER;
  };

  const getRoleLabel = (role: string) => {
    return role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : t('admin.user_label');
  };

  const getInitialColor = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'from-red-500/30 to-red-600/10 border-red-500/20 text-red-400',
      ADMIN: 'from-amber-500/30 to-amber-600/10 border-amber-500/20 text-amber-400',
      USER: 'from-blue-500/30 to-blue-600/10 border-blue-500/20 text-blue-400',
    };
    return colors[role] || colors.USER;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('admin.user_management')}</h1>
          <p className="text-sm text-gray-600 mt-1">{users.length} {t('common.total')}</p>
        </div>
        <button onClick={openCreateAdmin} className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-900/20">
          <HiUserPlus className="w-4 h-4" /> {t('admin.create_admin')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text" placeholder={t('admin.search_users')}
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setPage(1), loadUsers())}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 transition-all"
          />
        </div>
        <button onClick={() => { setPage(1); loadUsers(); }} className="px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-gray-300 hover:bg-white/[0.06] transition-all">
          {t('common.search')}
        </button>
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiSquares2X2 className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white'}`}>
            <HiListBullet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={viewMode === 'grid'
              ? 'h-40 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse'
              : 'flex items-center gap-4 bg-white/[0.03] rounded-xl p-4 animate-pulse'
            }>
              {viewMode === 'list' && <><div className="w-10 h-10 bg-white/5 rounded-xl" /><div className="flex-1 space-y-2"><div className="h-4 bg-white/5 rounded w-1/4" /><div className="h-3 bg-white/5 rounded w-1/3" /></div></>}
            </div>
          ))}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HiMagnifyingGlassCircle className="w-16 h-16 text-gray-700 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-1">{t('admin.user_not_found')}</h3>
          <p className="text-sm text-gray-600">{t('admin.try_changing_search')}</p>
        </div>
      )}

      {!loading && viewMode === 'grid' && users.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {users.map(u => (
            <div key={u.id} className="group rounded-2xl bg-white/[0.02] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getInitialColor(u.role)} border flex items-center justify-center shrink-0`}>
                  <span className="text-sm font-bold">{(u.displayName || u.username).charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.displayName || u.username}</p>
                  <p className="text-[11px] text-gray-600 truncate mt-0.5">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadge(u.role)}`}>
                  {getRoleLabel(u.role)}
                </span>
                {u.isBanned && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">{t('admin.banned')}</span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-gray-600 mb-3">
                <HiCalendarDays className="w-3 h-3" />
                {new Date(u.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => openEdit(u)} className="flex-1 py-1.5 bg-white/[0.04] hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 rounded-lg text-xs font-medium transition-all">{t('common.edit')}</button>
                {u.role !== 'SUPER_ADMIN' && (
                  <>
                    <button onClick={() => setBanModal({ id: u.id, isBanned: u.isBanned })} className="py-1.5 px-2 bg-white/[0.04] hover:bg-yellow-500/10 text-gray-400 hover:text-yellow-400 rounded-lg transition-all" title={u.isBanned ? t('admin.unban') : t('admin.ban_action')}>
                      {u.isBanned ? <HiCheck className="w-3.5 h-3.5" /> : <HiNoSymbol className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setDeleteId(u.id)} className="py-1.5 px-2 bg-white/[0.04] hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all" title={t('common.delete')}>
                      <HiTrash className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && viewMode === 'list' && users.length > 0 && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.user_label')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('auth.email')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.role')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.status')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('admin.registered')}</th>
                  <th className="px-5 py-3 text-left text-[11px] text-gray-600 uppercase tracking-wider font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getInitialColor(u.role)} border flex items-center justify-center shrink-0`}>
                          <span className="text-xs font-bold">{(u.displayName || u.username).charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{u.displayName || u.username}</p>
                          <p className="text-[11px] text-gray-600 font-mono">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadge(u.role)}`}>
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.isBanned ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">{t('admin.banned')}</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">{t('admin.active')}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title={t('common.edit')}>
                          <HiPencil className="w-4 h-4" />
                        </button>
                        {u.role !== 'SUPER_ADMIN' && (
                          <>
                            <button onClick={() => setBanModal({ id: u.id, isBanned: u.isBanned })} className={`p-2 rounded-lg transition-all ${u.isBanned ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'}`} title={u.isBanned ? t('admin.unban') : t('admin.ban_action')}>
                              {u.isBanned ? <HiCheck className="w-4 h-4" /> : <HiNoSymbol className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleResetPassword(u.id)} className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all" title={t('admin.reset_password')}>
                              <HiKey className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteId(u.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title={t('common.delete')}>
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-all"><HiChevronLeft className="w-5 h-5" /></button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{p}</button>;
            })}
          </div>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-all"><HiChevronRight className="w-5 h-5" /></button>
        </div>
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-white/[0.06] shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white">{editUser ? t('admin.edit_user') : t('admin.create_admin')}</h3>
              <button onClick={() => setShowDrawer(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {editUser && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getInitialColor(editUser.role)} border flex items-center justify-center`}>
                    <span className="text-lg font-bold">{(editUser.displayName || editUser.username).charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{editUser.displayName || editUser.username}</p>
                    <p className="text-xs text-gray-600">{editUser.email}</p>
                    <p className="text-[10px] text-gray-700 font-mono mt-0.5">ID: {editUser.id.substring(0, 12)}...</p>
                  </div>
                </div>
              )}

              {editUser ? (
                <>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('auth.username')}</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('auth.email')}</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.display_name')}</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" value={editForm.displayName} onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('admin.role')}</label>
                    <select className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white focus:outline-none focus:border-[#E50914]/50" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
                      <option value="USER">{t('admin.user_label')}</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all border border-white/[0.04]">
                    <div className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${editForm.isVerified ? 'bg-[#E50914]' : 'bg-white/10'}`} onClick={() => setEditForm(f => ({ ...f, isVerified: !f.isVerified }))}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editForm.isVerified ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-sm text-gray-300">{t('admin.email_verified')}</span>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('auth.email')}</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" placeholder="admin@ornek.com" value={newAdmin.email} onChange={e => setNewAdmin(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('auth.username')}</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" placeholder="admin123" value={newAdmin.username} onChange={e => setNewAdmin(f => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase tracking-wider mb-1.5 block font-medium">{t('auth.password')}</label>
                    <input className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30" type="password" placeholder="******" value={newAdmin.password} onChange={e => setNewAdmin(f => ({ ...f, password: e.target.value }))} />
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 p-4 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-white/[0.06] flex gap-3">
              <button onClick={editUser ? saveEdit : createAdmin} className="flex-1 py-2.5 bg-[#E50914] hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">
                {editUser ? t('common.update') : t('common.create')}
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
              <h3 className="text-lg font-semibold text-white">{t('admin.delete_user')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">{t('admin.delete_user_confirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all">{t('common.delete')}</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl text-sm transition-all">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)}>
          <div className="w-full max-w-sm bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-900/30 flex items-center justify-center">
                <HiNoSymbol className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{banModal.isBanned ? t('admin.remove_ban') : t('admin.ban_user')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 ml-[52px]">
              {banModal.isBanned ? t('admin.unban_confirm') : t('admin.ban_confirm')}
            </p>
            <div className="flex gap-3">
              <button onClick={handleBan} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${banModal.isBanned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                {banModal.isBanned ? t('admin.remove_ban') : t('admin.ban_action')}
              </button>
              <button onClick={() => setBanModal(null)} className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 rounded-xl text-sm transition-all">{t('common.cancel')}</button>
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
