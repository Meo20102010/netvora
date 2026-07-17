'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useTranslation } from '@/i18n';
import { HiEnvelope, HiArrowLeft } from 'react-icons/hi2';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Lütfen e-posta adresinizi girin.');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Şifre sıfırlama bağlantısı gönderildi!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Bir hata oluştu.';
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
            <h1 className="text-2xl font-bold mt-4">{t('auth.forgot_password')}</h1>
            <p className="text-[#808080] text-sm mt-2">
              E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E50914]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#E50914]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[#b3b3b3] mb-4">
                <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
                Lütfen gelen kutunu kontrol et.
              </p>
              <p className="text-xs text-[#555] mb-6">
                Spam klasörünü de kontrol etmeyi unutma.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors text-sm"
              >
                <HiArrowLeft className="w-4 h-4" />
                {t('auth.login')}
              </Link>
            </div>
          ) : (
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
                Şifre Sıfırlama Bağlantısı Gönder
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-[#808080] hover:text-white transition-colors text-sm"
                >
                  <HiArrowLeft className="w-4 h-4" />
                  {t('auth.login')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
