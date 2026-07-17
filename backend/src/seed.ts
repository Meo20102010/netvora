import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from './config';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Netvora seed başlatılıyor...');

  // Create Super Admin
  const existingAdmin = await prisma.user.findUnique({
    where: { email: config.admin.email },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(config.admin.password, 12);
    
    const admin = await prisma.user.create({
      data: {
        email: config.admin.email,
        password: hashedPassword,
        username: 'superadmin',
        displayName: 'Super Admin',
        role: 'SUPER_ADMIN',
        isVerified: true,
      },
    });

    console.log(`✅ Super Admin oluşturuldu: ${admin.email}`);
  } else {
    console.log(`ℹ️  Super Admin zaten mevcut: ${config.admin.email}`);
  }

  // Create default categories
  const categories = [
    { name: 'Aksiyon', slug: 'aksiyon', description: 'Aksiyon dolu film ve diziler' },
    { name: 'Komedi', slug: 'komedi', description: 'Güldüren içerikler' },
    { name: 'Dram', slug: 'dram', description: 'Duygusal hikayeler' },
    { name: 'Bilim Kurgu', slug: 'bilim-kurgu', description: 'Gelecek ve teknoloji' },
    { name: 'Korku', slug: 'korku', description: 'Gerilim dolu içerikler' },
    { name: 'Romantik', slug: 'romantik', description: 'Aşk hikayeleri' },
    { name: 'Gerilim', slug: 'gerilim', description: 'Heyecan dolu yapımlar' },
    { name: 'Belgesel', slug: 'belgesel', description: 'Gerçek hikayeler' },
    { name: 'Animasyon', slug: 'animasyon', description: 'Çizgi film ve animeler' },
    { name: 'Stand-Up', slug: 'stand-up', description: 'Komedi gösterileri' },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: category.slug } });
    if (!existing) {
      await prisma.category.create({ data: category });
      console.log(`✅ Kategori oluşturuldu: ${category.name}`);
    }
  }

  // Default site settings
  const defaultSettings = [
    { key: 'site_name', value: 'Netvora', type: 'string' },
    { key: 'site_description', value: 'Premium Dizi ve Film Platformu', type: 'string' },
    { key: 'site_logo', value: '/logo.png', type: 'string' },
    { key: 'site_favicon', value: '/favicon.ico', type: 'string' },
    { key: 'maintenance_mode', value: 'false', type: 'boolean' },
    { key: 'currency', value: 'TRY', type: 'string' },
    { key: 'default_language', value: 'tr', type: 'string' },
    { key: 'subscription_price', value: '200', type: 'number' },
    { key: 'subscription_days', value: '30', type: 'number' },
  ];

  for (const setting of defaultSettings) {
    const existing = await prisma.siteSetting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.siteSetting.create({ data: setting });
    }
  }

  console.log('✅ Varsayılan ayarlar oluşturuldu');

  // Default translations
  const translations = [
    { key: 'nav.home', language: 'tr', value: 'Ana Sayfa' },
    { key: 'nav.home', language: 'en', value: 'Home' },
    { key: 'nav.home', language: 'ar', value: 'الرئيسية' },
    { key: 'nav.home', language: 'de', value: 'Startseite' },
    { key: 'nav.movies', language: 'tr', value: 'Filmler' },
    { key: 'nav.movies', language: 'en', value: 'Movies' },
    { key: 'nav.series', language: 'tr', value: 'Diziler' },
    { key: 'nav.series', language: 'en', value: 'Series' },
    { key: 'nav.my_list', language: 'tr', value: 'Listem' },
    { key: 'nav.my_list', language: 'en', value: 'My List' },
    { key: 'auth.login', language: 'tr', value: 'Giriş Yap' },
    { key: 'auth.login', language: 'en', value: 'Sign In' },
    { key: 'auth.register', language: 'tr', value: 'Kayıt Ol' },
    { key: 'auth.register', language: 'en', value: 'Sign Up' },
    { key: 'auth.logout', language: 'tr', value: 'Çıkış Yap' },
    { key: 'auth.logout', language: 'en', value: 'Sign Out' },
    { key: 'subscription.buy', language: 'tr', value: 'Premium Satın Al' },
    { key: 'subscription.buy', language: 'en', value: 'Buy Premium' },
    { key: 'content.watch_now', language: 'tr', value: 'Hemen İzle' },
    { key: 'content.watch_now', language: 'en', value: 'Watch Now' },
    { key: 'content.add_list', language: 'tr', value: 'Listeme Ekle' },
    { key: 'content.add_list', language: 'en', value: 'Add to List' },
  ];

  for (const t of translations) {
    const existing = await prisma.translation.findUnique({
      where: { key_language: { key: t.key, language: t.language } },
    });
    if (!existing) {
      await prisma.translation.create({ data: t });
    }
  }

  console.log('✅ Varsayılan çeviriler oluşturuldu');
  console.log('🎉 Seed tamamlandı!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
