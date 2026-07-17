'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-6xl md:text-7xl font-black text-[#E50914] mb-4">!</h1>
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Bir Hata Oluştu</h2>
      <p className="text-[#808080] mb-8 max-w-md">Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.</p>
      <button onClick={reset} className="bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-3 rounded font-semibold text-sm transition-all hover:scale-105">
        Tekrar Dene
      </button>
    </div>
  );
}
