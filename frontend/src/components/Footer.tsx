'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation, setLanguage, supportedLanguages } from '@/i18n';
import { HiChevronDown, HiGlobeAlt } from 'react-icons/hi2';

const linkGroups = [
  { title: 'SSS', links: ['SSS', 'Yatırımcı İlişkileri', 'Kullanım Koşulları'] },
  { title: 'Yardım Merkezi', links: ['Yardım Merkezi', 'İş İmkanları', 'Gizlilik'] },
  { title: 'Hesap', links: ['Hesap', 'Hediye Kartları', 'Çerez Tercihleri'] },
  { title: 'Medya Merkezi', links: ['Medya Merkezi', 'Bize Ulaşın', 'Yasal Uyarılar'] },
];

const socials = ['facebook', 'twitter', 'instagram', 'youtube'];

export default function Footer() {
  const { t, lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = supportedLanguages.find((l) => l.code === lang) || supportedLanguages[0];

  return (
    <footer className="bg-[#0f0f0f] border-t border-white/5 mt-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Language selector */}
        <div className="relative inline-block mb-10" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#808080] border border-white/10 rounded hover:text-white hover:border-white/30 transition-all"
          >
            <HiGlobeAlt className="w-4 h-4" />
            <span>{current.nativeName}</span>
            <HiChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute bottom-full mb-2 left-0 w-44 bg-[#1f1f1f] border border-white/10 rounded-lg shadow-xl py-1 animate-scale-in origin-bottom-left z-10 max-h-60 overflow-y-auto">
              {supportedLanguages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    lang === l.code ? 'text-white bg-white/5' : 'text-[#b3b3b3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l.nativeName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {linkGroups.map((group) => (
            <div key={group.title}>
              {group.links.map((link) => (
                <p key={link} className="mb-3 text-[#808080] hover:text-white cursor-pointer transition-colors">
                  {link}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Social */}
        <div className="flex items-center gap-4 mt-10">
          {socials.map((s) => (
            <span
              key={s}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-xs text-[#555] hover:bg-[#E50914]/20 hover:text-[#E50914] transition-all cursor-pointer uppercase font-bold"
            >
              {s[0]}
            </span>
          ))}
        </div>

        {/* Copyright */}
        <p className="mt-8 text-xs text-[#555]">{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
