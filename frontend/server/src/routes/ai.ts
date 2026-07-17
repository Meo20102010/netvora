import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function getUserGenrePreferences(userId: string) {
  const history = await prisma.watchHistory.findMany({
    where: { userId },
    include: { content: { include: { category: true } } },
  });
  const genreCounts: Record<string, number> = {};
  for (const h of history) {
    const genre = h.content.category?.name || 'Unknown';
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  }
  return genreCounts;
}

async function getUserWatchedIds(userId: string): Promise<string[]> {
  const history = await prisma.watchHistory.findMany({ where: { userId } });
  return Array.from(new Set(history.map((h) => h.contentId)));
}

// GET /recommendations/:userId
router.get('/recommendations/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const genrePrefs = await getUserGenrePreferences(userId);
    const watchedIds = await getUserWatchedIds(userId);
    const topGenres = Object.entries(genrePrefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    const allContent = await prisma.content.findMany({
      where: { isActive: true, id: { notIn: watchedIds } },
      include: { category: true, ratings: true },
    });

    const scored = allContent.map((c) => {
      let score = 0;
      let reasons: string[] = [];

      if (topGenres.includes(c.category?.name || '')) {
        score += 30;
        reasons.push(`Sevdiğin ${c.category?.name} türünde`);
      }
      if (c.imdbRating && c.imdbRating >= 7.5) {
        score += 20;
        reasons.push(`Yüksek IMDB puanı: ${c.imdbRating}`);
      }
      if (c.isFeatured) {
        score += 15;
        reasons.push('Öne çıkan içerik');
      }
      if (c.year && c.year >= 2023) {
        score += 10;
        reasons.push('Yeni yapım');
      }
      const avgRating = c.ratings.length > 0
        ? c.ratings.reduce((sum, r) => sum + r.score, 0) / c.ratings.length
        : 0;
      if (avgRating >= 4) {
        score += 15;
        reasons.push('Yüksek kullanıcı puanı');
      }
      score += Math.random() * 10;

      return {
        content: c,
        score: Math.round(score * 10) / 10,
        reason: reasons[0] || 'Sana uygun öneriler',
        type: 'personalized',
      };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: scored.slice(0, 20) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Öneriler yüklenemedi' });
  }
});

// GET /what-to-watch
router.get('/what-to-watch', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const genrePrefs = await getUserGenrePreferences(userId);
    const watchedIds = await getUserWatchedIds(userId);
    const topGenres = Object.entries(genrePrefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([genre]) => genre);

    let pool = await prisma.content.findMany({
      where: { isActive: true, id: { notIn: watchedIds } },
      include: { category: true, ratings: true },
    });

    if (topGenres.length > 0) {
      const genreMatch = pool.filter((c) => topGenres.includes(c.category?.name || ''));
      if (genreMatch.length >= 3) pool = genreMatch;
    }

    pool.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
    const pick = pool[0];
    const alternatives = shuffleArray(pool.slice(1, 6));

    const reasons = [
      'İzleme geçmişine göre tam sana göre',
      'Bugünün en yüksek puanlı içeriği',
      'Tercih ettiğin türde öne çıkan',
      'Popüler ve yüksek beğenili',
    ];

    res.json({
      success: true,
      data: {
        dailyPick: pick ? {
          content: pick,
          score: 95,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          type: 'daily_pick',
        } : null,
        alternatives: alternatives.map((c) => ({
          content: c,
          score: Math.round((70 + Math.random() * 25) * 10) / 10,
          reason: 'Alternatif öneri',
          type: 'alternative',
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Öneri yüklenemedi' });
  }
});

// POST /summarize
router.post('/summarize', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contentId } = req.body;
    if (!contentId) {
      res.status(400).json({ success: false, error: 'contentId gerekli' });
      return;
    }
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      res.status(404).json({ success: false, error: 'İçerik bulunamadı' });
      return;
    }

    const tags = JSON.parse(content.tags || '[]');
    const cast = JSON.parse(content.cast || '[]');

    const summaries: Record<string, string> = {
      TR: `${content.title}, ${content.year || 'bilinmeyen yıl'} yılında çekilen ${content.type === 'MOVIE' ? 'bir film' : 'bir dizi'}dir. ${content.director ? `Yönetmenliğini ${content.director}'ın yaptığı ` : ''}${content.country ? `${content.country} ` : ''}yapımı bu ${content.type === 'MOVIE' ? 'filmin' : 'dizinin'} IMDB puanı ${content.imdbRating || 'henüz değerlendirilmemiş'}dir. ${tags.length > 0 ? `Etiketler: ${tags.join(', ')}. ` : ''}${cast.length > 0 ? `Başrollerde: ${cast.slice(0, 3).join(', ')}. ` : ''}${content.description || 'Bu içerik hakkında detaylı bilgi henüz mevcut değil.'}`,
      EN: `${content.title} is a ${content.year || 'unknown year'} ${content.type === 'MOVIE' ? 'film' : 'series'}. ${content.director ? `Directed by ${content.director}, ` : ''}${content.country ? `a ${content.country} production, ` : ''}it has an IMDB rating of ${content.imdbRating || 'not yet rated'}. ${tags.length > 0 ? `Tags: ${tags.join(', ')}. ` : ''}${cast.length > 0 ? `Starring: ${cast.slice(0, 3).join(', ')}. ` : ''}${content.description || 'No detailed description available yet.'}`,
      AR: `${content.title} هو ${content.type === 'MOVIE' ? 'فيلم' : 'مسلسل'} من إنتاج ${content.year || 'غير معروف'}. ${content.director ? `إخراج ${content.director}، ` : ''}${content.country ? `إنتاج ${content.country}، ` : ''}تقييمه على IMDB هو ${content.imdbRating || 'لم يتم التقييم بعد'}. ${tags.length > 0 ? `الوسوم: ${tags.join(', ')}. ` : ''}${cast.length > 0 ? `طاقم التمثيل: ${cast.slice(0, 3).join(', ')}. ` : ''}${content.description || 'لا يتوفر وصف تفصيلي بعد.'}`,
    };

    res.json({
      success: true,
      data: {
        contentId,
        title: content.title,
        summary: summaries.TR,
        summaries,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Özet oluşturulamadı' });
  }
});

// POST /episode-summary
router.post('/episode-summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contentId, episodeId, includeSpoilers } = req.body;
    if (!contentId || !episodeId) {
      res.status(400).json({ success: false, error: 'contentId ve episodeId gerekli' });
      return;
    }
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!content || !episode) {
      res.status(404).json({ success: false, error: 'İçerik veya bölüm bulunamadı' });
      return;
    }

    const spoilerWarning = !includeSpoilers
      ? 'Spoiler uyarı: Bu özet bazı detayları içerebilir!'
      : '';

    const summary = includeSpoilers
      ? `${content.title} - ${episode.title}: Bu bölümde olaylar gelişir ve karakterler arasında önemli etkileşimler yaşanır. ${episode.description || 'Bölüm detayları mevcut değil.'}`
      : `${content.title} - ${episode.title}: Bu bölüm ${episode.duration || '?'} dakika sürüyor. Hakkında detaylı bilgi için izlemenizi öneririz.`;

    res.json({
      success: true,
      data: {
        contentId,
        episodeId,
        title: `${content.title} - ${episode.title}`,
        summary,
        spoilerWarning,
        includeSpoilers: !!includeSpoilers,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Bölüm özeti oluşturulamadı' });
  }
});

// GET /similar/:contentId
router.get('/similar/:contentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contentId } = req.params;
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { category: true },
    });
    if (!content) {
      res.status(404).json({ success: false, error: 'İçerik bulunamadı' });
      return;
    }

    const tags = JSON.parse(content.tags || '[]');
    const castMembers = JSON.parse(content.cast || '[]');

    const candidates = await prisma.content.findMany({
      where: { isActive: true, id: { not: contentId } },
      include: { category: true },
    });

    const scored = candidates.map((c) => {
      let score = 0;
      let reasons: string[] = [];

      if (c.categoryId === content.categoryId) {
        score += 25;
        reasons.push('Aynı kategori');
      }
      if (c.director === content.director && content.director) {
        score += 20;
        reasons.push(`Aynı yönetmen: ${content.director}`);
      }
      const cTags = JSON.parse(c.tags || '[]');
      const commonTags = tags.filter((t: string) => cTags.includes(t));
      if (commonTags.length > 0) {
        score += commonTags.length * 10;
        reasons.push(`Ortak etiketler: ${commonTags.join(', ')}`);
      }
      const cCast = JSON.parse(c.cast || '[]');
      const commonCast = castMembers.filter((a: string) => cCast.includes(a));
      if (commonCast.length > 0) {
        score += commonCast.length * 15;
        reasons.push(`Ortak oyuncular: ${commonCast.join(', ')}`);
      }
      if (c.year && content.year && Math.abs(c.year - content.year) <= 2) {
        score += 10;
      }
      if (c.type === content.type) {
        score += 5;
      }
      score += Math.random() * 5;

      return {
        content: c,
        score: Math.round(score * 10) / 10,
        reason: reasons[0] || 'Benzer içerik',
        type: 'similar',
      };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json({ success: true, data: scored.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Benzer içerikler yüklenemedi' });
  }
});

// GET /age-appropriate/:userId
router.get('/age-appropriate/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const profile = await prisma.profile.findFirst({ where: { userId } });
    const isChild = profile?.isChild || false;

    const where: any = { isActive: true };
    if (isChild) {
      where.category = { name: { in: ['Animasyon', 'Animation', 'Çocuk', 'Kids'] } };
    }

    const content = await prisma.content.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        isChild,
        content,
        message: isChild
          ? 'Çocuk profiline uygun içerikler'
          : 'Tüm yaşlara uygun içerikler',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'İçerikler yüklenemedi' });
  }
});

export default router;
