import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-8xl md:text-9xl font-black text-[#E50914] mb-4">404</h1>
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Sayfa Bulunamadı</h2>
      <p className="text-[#808080] mb-8 max-w-md">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
      <Link href="/browse" className="bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-3 rounded font-semibold text-sm transition-all hover:scale-105">
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
