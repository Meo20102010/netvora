'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import {
  HiChartBar, HiUsers, HiFilm, HiTv, HiTag, HiCreditCard,
  HiBell, HiCog6Tooth, HiArrowLeftOnRectangle,
  HiHome, HiBars3, HiXMark, HiPhoto, HiArrowDownTray,
  HiDocumentChartBar, HiMagnifyingGlass, HiCommandLine,
  HiCheckCircle, HiExclamationTriangle,
  HiShieldCheck,
  HiChatBubbleLeftEllipsis,
  HiPlay,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useTranslation } from '@/i18n';

interface NavSection {
  label: string;
  items: { href: string; label: string; icon: any }[];
}

const navSections: NavSection[] = [
  {
    label: 'Genel',
    items: [
      { href: '/admin/dashboard', label: 'admin.dashboard', icon: HiChartBar },
      { href: '/admin/users', label: 'admin.users', icon: HiUsers },
    ],
  },
  {
    label: 'Icerik',
    items: [
      { href: '/admin/movies', label: 'admin.movies', icon: HiFilm },
      { href: '/admin/series', label: 'admin.series', icon: HiTv },
      { href: '/admin/anime', label: 'Anime', icon: HiPlay },
      { href: '/admin/import', label: 'admin.import', icon: HiArrowDownTray },
      { href: '/admin/categories', label: 'admin.categories', icon: HiTag },
      { href: '/admin/media', label: 'admin.media_manager', icon: HiPhoto },
      { href: '/admin/comments', label: 'admin.comments', icon: HiChatBubbleLeftEllipsis },
    ],
  },
  {
    label: 'Monetizasyon',
    items: [
      { href: '/admin/subscriptions', label: 'admin.subscriptions', icon: HiCreditCard },
      { href: '/admin/payments', label: 'admin.payment_approvals', icon: HiCreditCard },
    ],
  },
  {
    label: 'Iletisim',
    items: [
      { href: '/admin/notifications', label: 'admin.notifications', icon: HiBell },
      { href: '/admin/banners', label: 'admin.banners', icon: HiPhoto },
    ],
  },
  {
    label: 'Istatistik & Kalite',
    items: [
      { href: '/admin/stats', label: 'admin.detailed_stats', icon: HiChartBar },
      { href: '/admin/quality-control', label: 'admin.quality_control', icon: HiCheckCircle },
      { href: '/admin/errors', label: 'admin.error_monitoring', icon: HiExclamationTriangle },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { href: '/admin/settings', label: 'admin.settings', icon: HiCog6Tooth },
      { href: '/admin/security', label: 'security.title', icon: HiShieldCheck },
      { href: '/admin/backup', label: 'admin.backup', icon: HiArrowDownTray },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN'))) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/5 border-t-[#E50914]" />
            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-[#E50914]/20" />
          </div>
          <span className="text-sm text-gray-500 font-medium">Yukleniyor...</span>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    toast.success('Cikis yapildi');
    router.push('/login');
  };

  const isActive = (href: string) => pathname?.startsWith(href) ?? false;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0f0f0f]/95 backdrop-blur-xl
        border-r border-white/[0.04] transform transition-all duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.04]">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E50914] to-red-700 flex items-center justify-center shadow-lg shadow-red-900/20 group-hover:shadow-red-900/40 transition-all">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">NETVORA</span>
              <span className="block text-[10px] text-gray-600 font-medium uppercase tracking-widest">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-5 overflow-y-auto scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.label}>
              <span className="px-3 text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
                {section.label}
              </span>
              <div className="mt-1.5 space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
                        transition-all duration-200 group
                        ${active
                          ? 'text-white'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                        }
                      `}
                    >
                      {active && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#E50914]/10 to-[#E50914]/5 rounded-xl border border-[#E50914]/20" />
                      )}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#E50914] rounded-r-full" />
                      )}
                      <item.icon className={`w-[18px] h-[18px] relative z-10 ${active ? 'text-[#E50914]' : 'text-gray-600 group-hover:text-gray-400'}`} />
                      <span className="relative z-10">{t(item.label)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-white/[0.04] space-y-1">
          <Link
            href="/browse"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-500 hover:text-white hover:bg-white/[0.03] transition-all group"
          >
            <HiHome className="w-[18px] h-[18px] text-gray-600 group-hover:text-gray-400" />
            Siteye Don
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all w-full group"
          >
            <HiArrowLeftOnRectangle className="w-[18px] h-[18px] text-gray-600 group-hover:text-red-500" />
            Cikis Yap
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/[0.04]">
          <div className="flex items-center justify-between px-4 md:px-6 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <HiBars3 className="w-5 h-5" />
              </button>

              {/* Search Trigger */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-gray-500 hover:border-white/10 transition-all"
              >
                <HiMagnifyingGlass className="w-4 h-4" />
                <span>Ara...</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-600 font-mono">
                  <HiCommandLine className="w-3 h-3" />K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {/* User */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E50914]/20 to-[#E50914]/5 border border-[#E50914]/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#E50914]">
                      {user.displayName?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white leading-none">{user.displayName || user.username}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <HiMagnifyingGlass className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Dizi, film, kullanici ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              />
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-600 font-mono">ESC</kbd>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 text-center">Arama sonuclar burada gorunecek</p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
