'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/Navbar';
import { HiQuestionMarkCircle, HiPlay, HiUser, HiCreditCard, HiCog6Tooth, HiArrowLeft } from 'react-icons/hi2';
import Link from 'next/link';

const faqs = [
  { q: 'Nasıl üye olabilirim?', a: 'Ana sayfadaki "Kayıt Ol" butonuna tıklayarak e-posta adresiniz ve şifrenizle kolayca üye olabilirsiniz.' },
  { q: 'Premium nasıl satın alabilirim?', a: 'Premium sayfasından istediğiniz paketi seçip WhatsApp üzerinden ödeme talimatlarını takip edebilirsiniz.' },
  { q: 'Hangi cihazlarda izleyebilirim?', a: 'Netvora\'yı bilgisayar, akıllı telefon, tablet ve akıllı TV\'nizde izleyebilirsiniz.' },
  { q: 'İndirme özelliği var mı?', a: 'Evet, premium üyeler içerikleri çevrimdışı izlemek için indirebilir.' },
  { q: 'Hesabımı nasıl silebilirim?', a: 'Hesap ayarları sayfasından hesabınızı silebilir veya bizimle iletişime geçebilirsiniz.' },
  { q: 'Şifremi unuttum, ne yapmalıyım?', a: 'Giriş sayfasındaki "Şifremi Unuttum" bağlantısını kullanarak şifrenizi sıfırlayabilirsiniz.' },
];

export default function HelpPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="pt-24 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
        <Link href={isAuthenticated ? '/browse' : '/'} className="flex items-center gap-2 text-[#b3b3b3] hover:text-white transition-colors mb-6 w-fit">
          <HiArrowLeft className="w-5 h-5" /> Geri
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <HiQuestionMarkCircle className="w-8 h-8 text-[#E50914]" />
          <h1 className="text-2xl md:text-3xl font-black">Yardım</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[{ icon: HiPlay, title: 'İzleme', desc: 'İçerikleri nasıl izleyeceğinizi öğrenin', href: '#' },
            { icon: HiUser, title: 'Hesap Yönetimi', desc: 'Hesap ayarları ve profil yönetimi', href: '/account' },
            { icon: HiCreditCard, title: 'Fatura & Ödeme', desc: 'Ödeme yöntemleri ve faturalandırma', href: '/subscription' },
            { icon: HiCog6Tooth, title: 'Sıkça Sorulan Sorular', desc: 'En çok sorulan soruların cevapları', href: '#' },
          ].map((item) => (
            <Link key={item.title} href={item.href} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <item.icon className="w-6 h-6 text-[#E50914] shrink-0" />
              <div><h3 className="text-sm font-semibold text-white">{item.title}</h3><p className="text-xs text-[#808080]">{item.desc}</p></div>
            </Link>
          ))}
        </div>

        <h2 className="text-xl font-bold text-white mb-6">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <summary className="p-4 text-sm font-medium text-white cursor-pointer hover:bg-white/5 transition-colors list-none flex items-center justify-between">
                {faq.q}
                <svg className="w-4 h-4 text-[#808080] group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="p-4 pt-0 text-sm text-[#b3b3b3] border-t border-white/5">{faq.a}</div>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#808080] mb-2">Başka bir sorunuz mu var?</p>
          <a href="mailto:destek@netvora.com" className="text-[#E50914] hover:underline text-sm font-semibold">destek@netvora.com</a>
        </div>
      </main>
    </div>
  );
}
