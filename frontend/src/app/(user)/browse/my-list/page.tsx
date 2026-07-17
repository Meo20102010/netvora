'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyListRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/list'); }, [router]);
  return <div className="min-h-screen bg-[#141414]" />;
}
