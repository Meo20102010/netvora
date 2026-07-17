'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi2';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Doğrulama linki geçersiz.'); return; }
    const verify = async () => {
      try {
        const res = await authApi.forgotPassword(token);
        if (res.data.success) {
          setStatus('success');
          setMessage('E-posta adresiniz başarıyla doğrulandı!');
          setTimeout(() => router.push('/login'), 3000);
        }
      } catch {
        setStatus('error');
        setMessage('Doğrulama başarısız oldu. Link süresi dolmuş olabilir.');
      }
    };
    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#b3b3b3]">Doğrulanıyor...</p>
          </div>
        )}
        {status === 'success' && (
          <>
            <HiCheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">E-posta Doğrulandı!</h1>
            <p className="text-[#808080] mb-6">{message}</p>
            <p className="text-xs text-[#555]">Giriş sayfasına yönlendiriliyorsunuz...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <HiXCircle className="w-16 h-16 text-[#E50914] mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Doğrulama Başarısız</h1>
            <p className="text-[#808080] mb-6">{message}</p>
            <Link href="/login" className="inline-block bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-3 rounded font-semibold text-sm transition-all">
              Giriş Yap
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
