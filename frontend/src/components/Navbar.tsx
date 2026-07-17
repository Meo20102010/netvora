'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useTranslation, getLanguage, setLanguage, supportedLanguages } from '@/i18n';
import {
  HiMagnifyingGlass, HiBell, HiUser, HiCog6Tooth, HiArrowRightOnRectangle,
  HiBars3, HiXMark, HiChevronDown, HiLanguage,
} from 'react-icons/hi2';

const navLinks = [
  { href: '/browse', label: 'nav.home' },
  { href: '/browse/movies', label: 'nav.movies' },
  { href: '/browse/series', label: 'nav.series' },
  { href: '/browse/my-list', label: 'nav.my_list' },
];

export default function Navbar() {
  const { t, lang } = useTranslation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      import('@/lib/api').then(({ userApi }) => {
        userApi.getNotifications().then((res: any) => {
          if (res.data.success) setUnreadCount(res.data.meta?.unreadCount || 0);
        }).catch(() => {});
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    router.push('/');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#141414]/95 backdrop-blur-md shadow-lg shadow-black/20' : 'bg-gradient-to-b from-black/70 to-transparent'
      }`}
    >
      <div className="flex items-center justify-between px-4 md:px-12 h-16 md:h-20">
        {/* Left */}
        <div className="flex items-center gap-8">
          <Link href={isAuthenticated ? '/browse' : '/'} className="flex items-center gap-2 shrink-0 group">
            <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden ring-2 ring-[#E50914]/30 group-hover:ring-[#E50914]/60 transition-all">
              <Image src="/icon.jpg" alt="Netvora" fill className="object-cover" sizes="40px" priority />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight">
              <span className="text-[#E50914]">NET</span>VORA
            </span>
          </Link>

          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors duration-200 ${
                      isActive ? 'text-white font-semibold' : 'text-[#b3b3b3] hover:text-white'
                    }`}
                  >
                    {t(link.label)}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 md:gap-5">
          {isAuthenticated ? (
            <>
              <Link href="/search" className="text-[#b3b3b3] hover:text-white transition-colors">
                <HiMagnifyingGlass className="w-5 h-5 md:w-6 md:h-6" />
              </Link>

              <Link href="/notifications" className="relative text-[#b3b3b3] hover:text-white transition-colors">
                <HiBell className="w-5 h-5 md:w-6 md:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E50914] text-[10px] font-bold flex items-center justify-center text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1 text-[#b3b3b3] hover:text-white transition-colors text-sm"
                >
                  <HiLanguage className="w-5 h-5" />
                  <span className="hidden md:inline uppercase">{lang}</span>
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-[#1f1f1f] border border-white/10 rounded-lg shadow-xl py-1 animate-scale-in origin-top-right">
                    {supportedLanguages.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          lang === l.code ? 'text-white bg-white/5' : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {l.nativeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors"
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-[#E50914]/20 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <HiUser className="w-4 h-4 md:w-5 md:h-5 text-[#E50914]" />
                    )}
                  </div>
                  <HiChevronDown className={`w-4 h-4 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#1f1f1f] border border-white/10 rounded-lg shadow-xl py-2 animate-scale-in origin-top-right">
                    <div className="px-4 py-2 border-b border-white/5">
                      <p className="text-sm font-medium text-white truncate">{user?.username || user?.displayName}</p>
                      <p className="text-xs text-[#808080] truncate">{user?.email}</p>
                    </div>
                    <Link href="/account" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#b3b3b3] hover:text-white hover:bg-white/5 transition-colors">
                      <HiUser className="w-4 h-4" /> {t('nav.profiles')}
                    </Link>
                    {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                      <Link href="/admin/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#E50914] hover:text-white hover:bg-white/5 transition-colors border-b border-white/5">
                        <HiCog6Tooth className="w-4 h-4" /> {t('nav.admin_panel')}
                      </Link>
                    ) : null}
                    <Link href="/help" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#b3b3b3] hover:text-white hover:bg-white/5 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {t('nav.help')}
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[#b3b3b3] hover:text-white hover:bg-white/5 transition-colors">
                      <HiArrowRightOnRectangle className="w-4 h-4" /> {t('nav.sign_out')}
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden text-white"
              >
                {mobileOpen ? <HiXMark className="w-6 h-6" /> : <HiBars3 className="w-6 h-6" />}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-[#E50914] hover:bg-[#f40612] text-white px-4 py-1.5 md:px-5 md:py-2 rounded text-sm font-semibold transition-all"
            >
              {t('auth.sign_in_short')}
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {isAuthenticated && (
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            mobileOpen ? 'max-h-80' : 'max-h-0'
          }`}
        >
          <div className="px-4 pb-4 space-y-1 bg-[#141414]/95 backdrop-blur-md">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                    isActive ? 'text-white bg-white/5' : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t(link.label)}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
