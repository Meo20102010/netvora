'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { userApi, securityApi, subscriptionExtendedApi, ibanPaymentApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiUser, HiSparkles, HiHeart, HiBookmark, HiPlay, HiClock, HiStar,
  HiChatBubbleLeftEllipsis, HiBell, HiCreditCard, HiShieldCheck, HiCog6Tooth,
  HiArrowRightOnRectangle, HiCheck, HiCheckBadge, HiClipboardDocumentCheck,
  HiTrash, HiDevicePhoneMobile, HiGlobeAlt, HiSwatch, HiLanguage,
  HiVideoCamera, HiArrowLeft, HiXMark, HiBars3,
} from 'react-icons/hi2';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Section = 'profile' | 'membership' | 'favorites' | 'watch_later' | 'continue_watching' | 'history' | 'ratings' | 'comments' | 'notifications' | 'payments' | 'security' | 'settings';

const NAV: { id: Section; icon: typeof HiUser; key: string }[] = [
  { id: 'profile', icon: HiUser, key: 'account.profile' },
  { id: 'membership', icon: HiSparkles, key: 'account.membership' },
  { id: 'favorites', icon: HiHeart, key: 'account.favorites' },
  { id: 'watch_later', icon: HiBookmark, key: 'account.watch_later' },
  { id: 'continue_watching', icon: HiPlay, key: 'account.continue_watching' },
  { id: 'history', icon: HiClock, key: 'account.watch_history' },
  { id: 'ratings', icon: HiStar, key: 'account.ratings' },
  { id: 'comments', icon: HiChatBubbleLeftEllipsis, key: 'account.comments' },
  { id: 'notifications', icon: HiBell, key: 'account.notifications' },
  { id: 'payments', icon: HiCreditCard, key: 'account.payments' },
  { id: 'security', icon: HiShieldCheck, key: 'account.security' },
  { id: 'settings', icon: HiCog6Tooth, key: 'account.settings' },
];

const anim = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.3 } };

function Skel({ className = '' }: { className?: string }) { return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />; }

function Empty({ icon: Icon, text }: { icon: typeof HiUser; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center"><Icon className="w-8 h-8 text-white/20" /></div>
      <p className="text-white/30 text-sm">{text}</p>
    </div>
  );
}

function Header({ icon: Icon, title }: { icon: typeof HiUser; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-[#E50914]/10 flex items-center justify-center"><Icon className="w-5 h-5 text-[#E50914]" /></div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-white/40 block mb-1.5">{label}</label>{children}</div>;
}

export default function AccountPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const [section, setSection] = useState<Section>('profile');
  const [drawer, setDrawer] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/'); }, [isAuthenticated, router]);
  if (!isAuthenticated || !user) return null;

  const select = (s: Section) => { setSection(s); setDrawer(false); };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="pt-24 pb-16 px-4 md:px-8 lg:px-12 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* MOBILE TOGGLE */}
          <button onClick={() => setDrawer(true)} className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#E50914] flex items-center justify-center shadow-lg shadow-red-900/30">
            <HiBars3 className="w-6 h-6 text-white" />
          </button>

          {/* MOBILE OVERLAY */}
          <AnimatePresence>
            {drawer && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            )}
          </AnimatePresence>

          {/* SIDEBAR */}
          <aside className={`
            fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-full lg:h-auto
            w-[300px] lg:w-[280px] bg-[#0a0a0a] lg:bg-transparent
            border-r border-white/[0.06] lg:border-r-0
            transition-transform duration-300 ease-out
            ${drawer ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto pt-24 lg:pt-0 shrink-0
          `}>
            <div className="flex lg:hidden items-center justify-between px-5 mb-4">
              <span className="text-white font-semibold text-sm">{t('account.profile')}</span>
              <button onClick={() => setDrawer(false)} className="p-2 text-white/50"><HiXMark className="w-5 h-5" /></button>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden mb-4">
              <div className="p-5 flex items-center gap-4">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E50914] to-red-800 flex items-center justify-center text-white text-xl font-bold">
                    {(user.displayName || user.username || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{user.displayName || user.username}</p>
                  <p className="text-white/40 text-xs truncate">@{user.username}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20">
                    <HiCheckBadge className="w-3 h-3" />
                    {t(user.role === 'SUPER_ADMIN' ? 'account.role_superadmin' : user.role === 'ADMIN' ? 'account.role_admin' : 'account.role_user')}
                  </span>
                </div>
              </div>
            </div>

            <nav className="space-y-0.5">
              {NAV.map(item => {
                const act = section === item.id;
                return (
                  <button key={item.id} onClick={() => select(item.id)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium rounded-xl transition-all border-l-[3px] ${
                      act ? 'bg-[#E50914]/10 text-[#E50914] border-[#E50914]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.03] border-transparent'
                    }`}>
                    <item.icon className={`w-[18px] h-[18px] shrink-0 ${act ? 'text-[#E50914]' : ''}`} />
                    <span className="truncate">{t(item.key)}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <button onClick={() => setConfirmLogout(true)}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-xl transition-all">
                <HiArrowRightOnRectangle className="w-[18px] h-[18px]" />
                <span>{t('account.logout')}</span>
              </button>
            </div>
          </aside>

          {/* CONTENT */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={section} {...anim}>
                {section === 'profile' && <Profile user={user} t={t} setUser={setUser} />}
                {section === 'membership' && <Membership t={t} />}
                {section === 'favorites' && <Favorites t={t} />}
                {section === 'watch_later' && <WatchLater t={t} />}
                {section === 'continue_watching' && <ContinueWatch t={t} />}
                {section === 'history' && <History t={t} />}
                {section === 'ratings' && <Ratings t={t} />}
                {section === 'comments' && <MyComments t={t} />}
                {section === 'notifications' && <Notifs t={t} />}
                {section === 'payments' && <Payments t={t} />}
                {section === 'security' && <Security t={t} />}
                {section === 'settings' && <Settings t={t} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {confirmLogout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <HiArrowRightOnRectangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-white font-semibold">{t('account.logout')}</h3>
              </div>
              <p className="text-white/50 text-sm mb-6">{t('account.logout_confirm')}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-white/70 hover:bg-white/[0.1] text-sm font-medium transition-all">{t('common.cancel')}</button>
                <button onClick={() => { logout(); router.replace('/'); }} className="flex-1 py-2.5 rounded-xl bg-[#E50914] text-white hover:bg-red-700 text-sm font-medium transition-all">{t('account.logout')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── PROFILE ─── */
function Profile({ user, t, setUser }: { user: any; t: (k: string) => string; setUser: (u: any) => void }) {
  const [name, setName] = useState(user.displayName || '');
  const [ava, setAva] = useState(user.avatar || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ displayName: name, avatar: ava });
      if (res.data.success) { setUser({ ...user, displayName: name, avatar: ava }); toast.success(t('account.save')); }
    } catch { toast.error(t('common.error')); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Header icon={HiUser} title={t('account.profile')} />
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          {ava ? (
            <img src={ava} alt="" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-white/10" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#E50914] to-red-800 flex items-center justify-center text-white text-3xl font-bold">
              {(name || user.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-lg">{name || user.username}</p>
            <p className="text-white/40 text-sm">@{user.username}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#E50914]/10 text-[#E50914]">
                <HiCheckBadge className="w-3 h-3" />
                {t(user.role === 'SUPER_ADMIN' ? 'account.role_superadmin' : user.role === 'ADMIN' ? 'account.role_admin' : 'account.role_user')}
              </span>
              {user.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                  <HiCheck className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label={t('account.display_name')}>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#E50914]/50 transition-colors" />
          </Field>
          <Field label={t('account.username')}>
            <input value={user.username} disabled className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-white/40 text-sm cursor-not-allowed" />
          </Field>
          <Field label={t('account.email')}>
            <input value={user.email} disabled className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-white/40 text-sm cursor-not-allowed" />
          </Field>
          <Field label={t('account.user_id')}>
            <div className="flex gap-2">
              <input value={user.id} readOnly className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-white/40 text-xs font-mono" />
              <button onClick={() => { navigator.clipboard.writeText(user.id); setCopied(true); toast.success(t('account.copied')); setTimeout(() => setCopied(false), 2000); }}
                className="px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all">
                <HiClipboardDocumentCheck className={`w-5 h-5 ${copied ? 'text-green-400' : ''}`} />
              </button>
            </div>
          </Field>
          {user.createdAt && (
            <Field label={t('account.joined')}>
              <p className="text-white/50 text-sm py-3">{new Date(user.createdAt).toLocaleDateString()}</p>
            </Field>
          )}
        </div>
        <button onClick={save} disabled={saving} className="mt-6 px-8 py-3 bg-[#E50914] hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 text-sm">
          {saving ? t('account.saving') : t('account.save')}
        </button>
      </div>
    </div>
  );
}

/* ─── MEMBERSHIP ─── */
function Membership({ t }: { t: (k: string) => string }) {
  const [sub, setSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userApi.getSubscription().then(r => setSub(r.data?.data ?? r.data)),
      subscriptionExtendedApi.getInvoices().then(r => { const d = r.data?.data; setInvoices(Array.isArray(d) ? d : Array.isArray(r.data) ? r.data : []); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header icon={HiSparkles} title={t('account.membership')} />
      {loading ? <Skel className="h-40 w-full" /> : sub ? (
        <motion.div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden" {...anim}>
          <div className="bg-gradient-to-r from-[#E50914]/20 to-transparent p-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{t('account.plan')}</p>
                <p className="text-white text-2xl font-bold">{sub.packageName}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sub.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {sub.status === 'ACTIVE' ? t('account.status_active') : t('account.status_expired')}
              </span>
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div><p className="text-white/40 text-xs mb-1">{t('account.start_date')}</p><p className="text-white text-sm">{new Date(sub.startDate).toLocaleDateString()}</p></div>
            <div><p className="text-white/40 text-xs mb-1">{t('account.expires')}</p><p className="text-white text-sm">{new Date(sub.endDate).toLocaleDateString()}</p></div>
          </div>
        </motion.div>
      ) : <Empty icon={HiSparkles} text={t('account.no_subscription')} />}

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">{t('account.invoices')}</h3>
        {invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((inv: any, i: number) => (
              <div key={inv.id || i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                <div>
                  <p className="text-white text-sm">{inv.packageName || inv.description || '-'}</p>
                  <p className="text-white/40 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{inv.amount} {inv.currency}</p>
                  <span className={`text-xs ${inv.status === 'APPROVED' ? 'text-green-400' : inv.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-white/30 text-sm text-center py-6">{t('account.no_invoices')}</p>}
      </div>
    </div>
  );
}

/* ─── FAVORITES ─── */
function Favorites({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getFavorites().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    try { await userApi.removeFavorite(id); setItems(p => p.filter(f => f.contentId !== id)); toast.success(t('content.removed_from_list')); } catch {}
  };

  return (
    <div className="space-y-6">
      <Header icon={HiHeart} title={t('account.favorites')} />
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl"><Skel className="w-full h-full" /></div>)}</div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((fav: any, i: number) => {
            const c = fav.content || fav;
            return (
              <motion.div key={fav.id || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                {c.posterUrl ? <img src={c.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><HiVideoCamera className="w-10 h-10" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{c.type}</span>
                    <button onClick={() => remove(fav.contentId || fav.id)} className="ml-auto p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><HiTrash className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : <Empty icon={HiHeart} text={t('account.no_favorites')} />}
    </div>
  );
}

/* ─── WATCH LATER ─── */
function WatchLater({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getWatchLater().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const remove = async (id: string) => {
    try { await userApi.removeWatchLater(id); setItems(p => p.filter(w => w.contentId !== id)); toast.success(t('content.removed_from_list')); } catch {}
  };

  return (
    <div className="space-y-6">
      <Header icon={HiBookmark} title={t('account.watch_later')} />
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl"><Skel className="w-full h-full" /></div>)}</div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item: any, i: number) => {
            const c = item.content || item;
            return (
              <motion.div key={item.id || i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group relative aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                {c.posterUrl ? <img src={c.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20"><HiVideoCamera className="w-10 h-10" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/70">{c.type}</span>
                    <button onClick={() => remove(item.contentId || item.id)} className="ml-auto p-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"><HiTrash className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : <Empty icon={HiBookmark} text={t('account.no_watch_later')} />}
    </div>
  );
}

/* ─── CONTINUE WATCHING ─── */
function ContinueWatch({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getContinueWatching().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header icon={HiPlay} title={t('account.continue_watching')} />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-48 w-full" />)}</div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any, i: number) => {
            const c = item.content || item;
            const pct = c.duration && item.progress ? Math.min((item.progress / (c.duration * 60)) * 100, 100) : 0;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/movie/${c.slug || c.id}`} className="group block bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all">
                  <div className="relative aspect-video">
                    {c.coverUrl || c.posterUrl ? <img src={c.coverUrl || c.posterUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/[0.04] flex items-center justify-center"><HiPlay className="w-12 h-12 text-white/10" /></div>}
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-[#E50914]/90 flex items-center justify-center shadow-lg shadow-red-900/40"><HiPlay className="w-6 h-6 text-white ml-0.5" /></div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10"><div className="h-full bg-[#E50914] transition-all" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="p-3">
                    <p className="text-white text-sm font-medium truncate">{c.title}</p>
                    {item.episode && <p className="text-white/40 text-xs truncate mt-0.5">S{item.episode.episodeNumber} - {item.episode.title}</p>}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      ) : <Empty icon={HiPlay} text={t('account.no_continue')} />}
    </div>
  );
}

/* ─── HISTORY ─── */
function History({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getWatchHistory().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header icon={HiClock} title={t('account.watch_history')} />
      {loading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-20 w-full" />)}</div>
      : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item: any, i: number) => {
            const c = item.content || item;
            const pct = c.duration && item.progress ? Math.min((item.progress / (c.duration * 60)) * 100, 100) : 0;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-white/[0.04]">
                <div className="w-16 h-10 rounded-lg overflow-hidden shrink-0 bg-white/[0.04]">
                  {c.posterUrl && <img src={c.posterUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.title}</p>
                  <p className="text-white/40 text-xs">{item.watchedAt ? new Date(item.watchedAt).toLocaleDateString() : ''}</p>
                  <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#E50914] rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
                <span className="text-white/30 text-xs shrink-0">{Math.round(pct)}%</span>
              </motion.div>
            );
          })}
        </div>
      ) : <Empty icon={HiClock} text={t('account.no_history')} />}
    </div>
  );
}

/* ─── RATINGS ─── */
function Ratings({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getMyRatings().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header icon={HiStar} title={t('account.ratings')} />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-24 w-full" />)}</div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((r: any, i: number) => {
            const c = r.content || r;
            const score = r.score || 0;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-white/[0.04]">
                  {c.posterUrl && <img src={c.posterUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(s => <HiStar key={s} className={`w-4 h-4 ${s <= Math.round(score / 2) ? 'text-yellow-400' : 'text-white/10'}`} />)}
                    <span className="text-white/40 text-xs ml-1">{score}/10</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : <Empty icon={HiStar} text={t('account.no_ratings')} />}
    </div>
  );
}

/* ─── MY COMMENTS ─── */
function MyComments({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getMyComments().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header icon={HiChatBubbleLeftEllipsis} title={t('account.comments')} />
      {loading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-20 w-full" />)}</div>
      : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((comment: any, i: number) => (
            <motion.div key={comment.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#E50914] text-xs font-medium">{comment.content?.title || '-'}</span>
                <span className="text-white/20 text-xs">{new Date(comment.createdAt).toLocaleDateString()}</span>
                {comment.hasSpoiler && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">Spoiler</span>}
              </div>
              <p className="text-white/70 text-sm">{comment.text}</p>
            </motion.div>
          ))}
        </div>
      ) : <Empty icon={HiChatBubbleLeftEllipsis} text={t('account.no_comments')} />}
    </div>
  );
}

/* ─── NOTIFICATIONS ─── */
function Notifs({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.getNotifications().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : Array.isArray(r.data) ? r.data : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    try { await userApi.markNotificationRead(id); setItems(p => p.map(n => n.id === id ? { ...n, isRead: true } : n)); } catch {}
  };

  const markAll = async () => {
    for (const n of items.filter(x => !x.isRead)) { try { await userApi.markNotificationRead(n.id); } catch {} }
    setItems(p => p.map(n => ({ ...n, isRead: true })));
  };

  const unread = items.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Header icon={HiBell} title={t('account.notifications')} />
        {unread > 0 && <button onClick={markAll} className="text-xs text-[#E50914] hover:text-red-400 transition-colors">{t('account.mark_all_read')}</button>}
      </div>
      {loading ? <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skel key={i} className="h-16 w-full" />)}</div>
      : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((n, i) => (
            <motion.div key={n.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${n.isRead ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white/[0.05] border-white/[0.08]'}`}>
              <div className="flex items-start gap-3">
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#E50914] mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.isRead ? 'text-white/60' : 'text-white'}`}>{n.title}</p>
                  <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-white/20 text-[10px] mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : <Empty icon={HiBell} text={t('account.no_notifications')} />}
    </div>
  );
}

/* ─── PAYMENTS ─── */
function Payments({ t }: { t: (k: string) => string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ibanPaymentApi.getMyPayments().then(r => { const d = r.data?.data; setItems(Array.isArray(d) ? d : []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header icon={HiCreditCard} title={t('account.payments')} />
      {loading ? <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-16 w-full" />)}</div>
      : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((p: any, i: number) => (
            <motion.div key={p.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div>
                <p className="text-white text-sm font-medium">{p.packageName || '-'}</p>
                <p className="text-white/40 text-xs mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold text-sm">{p.amount} {p.currency || 'TL'}</p>
                <span className={`text-xs font-medium ${p.status === 'APPROVED' ? 'text-green-400' : p.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>{p.status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : <Empty icon={HiCreditCard} text={t('account.no_payments')} />}
    </div>
  );
}

/* ─── SECURITY ─── */
function Security({ t }: { t: (k: string) => string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [twoFA, setTwoFA] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      securityApi.getDevices().then(r => { const d = r.data?.data; setDevices(Array.isArray(d) ? d : []); }).catch(() => {}),
      securityApi.getLoginHistory().then(r => { const d = r.data?.data; setHistory(Array.isArray(d) ? d : []); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const toggle2FA = async () => {
    try {
      if (twoFA) { await securityApi.disable2FA(''); toast.success('2FA disabled'); }
      else { await securityApi.enable2FA(); toast.success('2FA enabled'); }
      setTwoFA(!twoFA);
    } catch { toast.error(t('common.error')); }
  };

  const revoke = async (id: string) => {
    try { await securityApi.revokeDevice(id); setDevices(p => p.filter(d => d.id !== id)); toast.success(t('account.revoke')); } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="space-y-6">
      <Header icon={HiShieldCheck} title={t('account.security')} />

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HiShieldCheck className="w-5 h-5 text-[#E50914]" />
            <div>
              <p className="text-white text-sm font-medium">{t('account.two_factor')}</p>
              <p className="text-white/40 text-xs">{twoFA ? t('account.enable_2fa') : t('account.disable_2fa')}</p>
            </div>
          </div>
          <button onClick={toggle2FA} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${twoFA ? 'bg-[#E50914]' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${twoFA ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <HiDevicePhoneMobile className="w-5 h-5 text-[#E50914]" />
          {t('account.active_sessions')}
        </h3>
        {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-14 w-full" />)}</div>
        : devices.length > 0 ? (
          <div className="space-y-2">
            {devices.map((d: any, i: number) => (
              <div key={d.id || i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{d.userAgent || t('account.device_info')}</p>
                  <p className="text-white/40 text-xs">{d.ipAddress || t('account.ip_address')}</p>
                  <p className="text-white/30 text-[10px]">{new Date(d.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => revoke(d.id)} className="ml-3 px-3 py-1.5 rounded-lg text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors shrink-0">{t('account.revoke')}</button>
              </div>
            ))}
          </div>
        ) : <Empty icon={HiDevicePhoneMobile} text={t('account.active_sessions')} />}
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <HiGlobeAlt className="w-5 h-5 text-[#E50914]" />
          {t('account.login_history')}
        </h3>
        {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-14 w-full" />)}</div>
        : history.length > 0 ? (
          <div className="space-y-2">
            {history.map((l: any, i: number) => (
              <div key={l.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                <div className={`w-2 h-2 rounded-full shrink-0 ${l.success !== false ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm">{l.ipAddress || '-'}</p>
                  <p className="text-white/40 text-xs">{l.userAgent || '-'}</p>
                </div>
                <p className="text-white/30 text-xs shrink-0">{new Date(l.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : <Empty icon={HiGlobeAlt} text={t('account.login_history')} />}
      </div>
    </div>
  );
}

/* ─── SETTINGS ─── */
function Settings({ t }: { t: (k: string) => string }) {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('tr');
  const [quality, setQuality] = useState('auto');

  const langs = [
    { code: 'tr', name: 'Türkçe' }, { code: 'en', name: 'English' }, { code: 'ar', name: 'العربية' },
    { code: 'de', name: 'Deutsch' }, { code: 'fr', name: 'Français' }, { code: 'es', name: 'Español' },
    { code: 'ru', name: 'Русский' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
  ];

  return (
    <div className="space-y-6">
      <Header icon={HiCog6Tooth} title={t('account.settings')} />
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6 space-y-6">
        {/* Theme */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HiSwatch className="w-5 h-5 text-[#E50914]" />
            <div>
              <p className="text-white text-sm font-medium">{t('account.theme')}</p>
              <p className="text-white/40 text-xs">{theme === 'dark' ? t('account.theme_dark') : t('account.theme_light')}</p>
            </div>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-[#E50914]' : 'bg-white/20'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${theme === 'dark' ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Language */}
        <div className="border-t border-white/[0.06] pt-6">
          <div className="flex items-center gap-3 mb-3">
            <HiLanguage className="w-5 h-5 text-[#E50914]" />
            <p className="text-white text-sm font-medium">{t('account.language')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {langs.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)} className={`py-2.5 rounded-xl text-xs font-medium transition-all ${lang === l.code ? 'bg-[#E50914] text-white' : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'}`}>{l.name}</button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div className="border-t border-white/[0.06] pt-6">
          <div className="flex items-center gap-3 mb-3">
            <HiVideoCamera className="w-5 h-5 text-[#E50914]" />
            <p className="text-white text-sm font-medium">{t('account.video_quality')}</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['auto', '720p', '1080p', '4k'].map(q => (
              <button key={q} onClick={() => setQuality(q)} className={`py-2.5 rounded-xl text-xs font-medium transition-all ${quality === q ? 'bg-[#E50914] text-white' : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'}`}>
                {q === 'auto' ? t('account.quality_auto') : q.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
