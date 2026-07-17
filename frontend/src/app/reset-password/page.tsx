'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { HiCheckCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır'); return; }
    if (password !== confirm) { toast.error('Şifreler eşleşmiyor'); return; }
    setLoading(true);
    try {
      const res = await authApi.resetPassword(token!, password);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch { toast.error('Şifre sıfırlama başarısız oldu.'); }
    setLoading(false);
  };

  if (!token) return null;

  if (success) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center px-6">
        <div className="text-center">
          <HiCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Şifre Sıfırlandı!</h1>
          <p className="text-[#808080] mb-6">Yeni şifreniz başarıyla oluşturuldu.</p>
          <p className="text-xs text-[#555]">Giriş sayfasına yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Yeni Şifre</h1>
          <p className="text-[#808080] text-sm">Yeni şifrenizi belirleyin</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#808080] block mb-1">Yeni Şifre</label>
            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 6 karakter" minLength={6} required />
          </div>
          <div>
            <label className="text-xs text-[#808080] block mb-1">Şifre Tekrar</label>
            <input type="password" className="input-field" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Şifrenizi tekrar girin" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
          </button>
        </form>
        <div className="text-center mt-6">
          <Link href="/login" className="text-sm text-[#808080] hover:text-white transition-colors">Giriş Yap</Link>
        </div>
      </div>
    </div>
  );
}
