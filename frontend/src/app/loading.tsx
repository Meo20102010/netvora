export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#808080] text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
}
