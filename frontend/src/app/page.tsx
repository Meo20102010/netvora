'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Script from 'next/script';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/i18n';
import { GlassCard, PageTransition, ParallaxSection, AnimatedCounter } from '@/components/ui';
import { HiChevronDown, HiDevicePhoneMobile, HiTv, HiComputerDesktop } from 'react-icons/hi2';

const features = [
  { icon: HiTv, title: 'Her yerde izle', desc: 'TV, tablet, telefon ve bilgisayarında izle.' },
  { icon: HiDevicePhoneMobile, title: 'Çevrimdışı indir', desc: 'İndir ve mobil verin olmadan izle.' },
  { icon: HiComputerDesktop, title: 'Reklamsız', desc: 'Kesintisiz, reklamsız keyif.' },
];

const faqs = [
  { q: 'Netvora nedir?', a: 'Netvora, geniş film ve dizi arşivine sahip premium bir dijital yayın platformudur. Dilediğiniz zaman iptal edebilirsiniz.' },
  { q: 'Netvora ücretli mi?', a: 'Evet, Netvora abonelik bazlı bir hizmettir. Size en uygun paketi seçebilirsiniz.' },
  { q: 'Nerede izleyebilirim?', a: 'Netvora\'yı web tarayıcınız, akıllı telefonunuz, tabletiniz ve akıllı TV\'nizde izleyebilirsiniz.' },
  { q: 'Nasıl iptal ederim?', a: 'Hesap ayarlarından aboneliğinizi istediğiniz zaman iptal edebilirsiniz. İptal sonrası erişiminiz fatura dönemi sonuna kadar devam eder.' },
  { q: 'Çevrimdışı izleme var mı?', a: 'Evet, seçili içerikleri indirerek internet olmadan izleyebilirsiniz.' },
];

const stats = [
  { value: 10000, suffix: '+', label: 'Film & Dizi' },
  { value: 500000, suffix: '+', label: 'Kullanıcı' },
  { value: 100, suffix: 'K', label: 'Saat İçerik' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function LandingPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthenticated) router.replace('/browse');
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  return (
    <PageTransition>
      <Script id="landing-seo" type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Netvora',
          url: 'https://netvora-green.vercel.app',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://netvora-green.vercel.app/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
          description: 'Netvora ile sınırsız film, dizi ve belgesel izleyin.',
          inLanguage: 'tr',
          publisher: {
            '@type': 'Organization',
            name: 'Netvora',
            url: 'https://netvora-green.vercel.app',
            logo: {
              '@type': 'ImageObject',
              url: 'https://netvora-green.vercel.app/icon.jpg',
            },
          },
        })}
      </Script>
      <Script id="faq-seo" type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a,
            },
          })),
        })}
      </Script>
      <div className="min-h-screen bg-[#0a0a0a] overflow-hidden">
        {/* Animated gradient background */}
        <div className="fixed inset-0 -z-10">
          <motion.div
            animate={{
              background: [
                'radial-gradient(ellipse at 20% 50%, rgba(229,9,20,0.08) 0%, transparent 50%)',
                'radial-gradient(ellipse at 80% 20%, rgba(229,9,20,0.06) 0%, transparent 50%)',
                'radial-gradient(ellipse at 50% 80%, rgba(229,9,20,0.08) 0%, transparent 50%)',
                'radial-gradient(ellipse at 20% 50%, rgba(229,9,20,0.08) 0%, transparent 50%)',
              ],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="fixed inset-0"
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsPSJub25lIiBmaWxsLW9wYWNpdHk9IjAuMDMiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMTBsMTAgMTcuMzJIMTB6IiBmaWxsPSIjRTUwOTE0Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        </div>

        {/* Hero */}
        <section className="relative h-screen min-h-[600px] flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0a0a0a]/40 to-[#0a0a0a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#E50914]/20 via-transparent to-transparent" />

          {/* Nav */}
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 md:w-11 md:h-11 rounded-lg overflow-hidden ring-2 ring-[#E50914]/40">
                <Image src="/icon.jpg" alt="Netvora" fill className="object-cover" sizes="44px" priority />
              </div>
              <span className="text-3xl md:text-4xl font-black tracking-tight">
                <span className="text-[#E50914]">NET</span>VORA
              </span>
            </div>
            <Link
              href="/login"
              className="bg-[#E50914] hover:bg-[#f40612] text-white px-5 py-2 rounded font-semibold text-sm transition-all hover:scale-105"
            >
              {t('auth.sign_in_short')}
            </Link>
          </motion.nav>

          {/* Hero content with parallax */}
          <ParallaxSection intensity={10} className="relative z-10 flex-1 flex items-center px-6 md:px-12">
            <div className="max-w-3xl">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-4"
              >
                {t('home.hero_title')}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="text-lg md:text-xl text-[#b3b3b3] mb-8 max-w-xl"
              >
                {t('home.hero_desc')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-4 rounded text-lg font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#E50914]/30"
                >
                  {t('auth.register')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </motion.div>
            </div>
          </ParallaxSection>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="relative z-10 flex justify-center pb-8"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HiChevronDown className="w-8 h-8 text-[#808080]" />
            </motion.div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="px-6 md:px-12 py-16 max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, i) => (
              <GlassCard key={i} delay={i * 0.1} hover={false} className="p-6 text-center">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  className="text-3xl md:text-4xl font-black text-[#E50914]"
                />
                <p className="text-[#808080] text-sm mt-2">{stat.label}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-6 md:px-12 py-20 max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            Neden <span className="text-[#E50914]">Netvora</span>?
          </motion.h2>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} variants={fadeUp}>
                  <GlassCard delay={0} className="p-8 text-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#E50914]/10 flex items-center justify-center"
                    >
                      <Icon className="w-8 h-8 text-[#E50914]" />
                    </motion.div>
                    <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                    <p className="text-[#808080]">{f.desc}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="px-6 md:px-12 py-20 max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-16"
          >
            Sıkça Sorulan <span className="text-[#E50914]">Sorular</span>
          </motion.h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard hover={false} className="overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left text-lg font-medium hover:bg-white/[0.02] transition-colors"
                  >
                    {faq.q}
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <HiChevronDown className="w-5 h-5 text-[#808080]" />
                    </motion.div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{
                      height: openFaq === i ? 'auto' : 0,
                      opacity: openFaq === i ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5">
                      <p className="text-[#b3b3b3] leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 md:px-12 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <GlassCard hover={false} className="p-12 max-w-3xl mx-auto bg-gradient-to-b from-[#E50914]/10 to-transparent border-[#E50914]/20">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Hemen katıl. Sınırsız eğlenceye başla.
              </h2>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-[#f40612] text-white px-8 py-4 rounded text-lg font-bold transition-all hover:scale-105"
              >
                {t('auth.register')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </GlassCard>
          </motion.div>
        </section>
      </div>
    </PageTransition>
  );
}
