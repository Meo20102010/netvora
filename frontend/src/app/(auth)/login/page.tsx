'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { HiEye, HiEyeSlash, HiEnvelope } from 'react-icons/hi2';

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (config: any) => void; renderButton: (el: HTMLElement, config: any) => void; prompt: () => void } } };
  }
}

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, googleLogin } = useAuthStore();
  const router = useRouter();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        callback: async (response: any) => {
          try {
            await googleLogin(response.credential);
            toast.success('Giriş başarılı!');
            router.push('/browse');
          } catch (err: any) {
            toast.error('Google ile giriş yapılamadı.');
          }
        },
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    }
  }, [googleLogin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      toast.success('Giriş başarılı!');
      router.push('/browse');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Giriş yapılırken bir hata oluştu.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#141414]">
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#141414] to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#E50914]/5 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 md:p-10 animate-fade-in">
          <div className="text-center mb-8">
            <span className="text-3xl font-black tracking-tight">
              <span className="text-[#E50914]">NET</span>VORA
            </span>
            <h1 className="text-2xl font-bold mt-4">{t('auth.login')}</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <HiEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808080]" />
              <input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-12"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#808080] hover:text-white transition-colors"
              >
                {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-[#b3b3b3] hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#333] bg-[#1f1f1f] text-[#E50914] focus:ring-[#E50914]"
                />
                Beni Hatırla
              </label>
              <Link href="/forgot-password" className="text-[#b3b3b3] hover:text-[#E50914] transition-colors">
                {t('auth.forgot_password')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {t('auth.login')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-[#808080] uppercase tracking-wider">veya</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div ref={googleBtnRef} className="w-full [&>div]:w-full [&>div>div]:w-full" />

          <p className="mt-6 text-center text-sm text-[#808080]">
            {t('auth.no_account')}{' '}
            <Link href="/register" className="text-white hover:text-[#E50914] transition-colors font-medium">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>

      <script src="https://accounts.google.com/gsi/client" async defer />
    </div>
  );
}
