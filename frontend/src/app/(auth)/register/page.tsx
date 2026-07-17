'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { HiEye, HiEyeSlash, HiEnvelope, HiUser } from 'react-icons/hi2';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuthStore();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email || !username || !password || !confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun.');
      return false;
    }
    if (username.length < 3) {
      toast.error('Kullanıcı adı en az 3 karakter olmalıdır.');
      return false;
    }
    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır.');
      return false;
    }
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register(email, password, username);
      toast.success('Kayıt başarılı!');
      router.push('/browse');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Kayıt olurken bir hata oluştu.';
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
            <h1 className="text-2xl font-bold mt-4">{t('auth.register')}</h1>
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
              <HiUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808080]" />
              <input
                type="text"
                placeholder={t('auth.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field pl-12"
                autoComplete="username"
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
                autoComplete="new-password"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#808080] hover:text-white transition-colors"
              >
                {showConfirm ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
              </button>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Şifre (Tekrar)"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pr-12"
                autoComplete="new-password"
              />
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
              {t('auth.register')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#808080]">
            {t('auth.has_account')}{' '}
            <Link href="/login" className="text-white hover:text-[#E50914] transition-colors font-medium">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
