import { Router, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

function asyncHandler(fn: (req: any, res: any, next: any) => Promise<any>) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ── Comments ──

router.get('/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { episodeId } = req.query;
    const where: any = { contentId, isDeleted: false };
    if (episodeId) where.episodeId = episodeId as string;
    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        reactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Yorumlar yüklenemedi' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contentId, episodeId, text, hasSpoiler } = req.body;
    const userId = req.user!.userId;
    if (!contentId || !text) {
      res.status(400).json({ success: false, error: 'contentId ve text gerekli' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

    if (!isAdmin) {
      const commentCount = await prisma.comment.count({
        where: { userId, contentId, episodeId: episodeId || null, isDeleted: false },
      });
      if (commentCount >= 3) {
        res.status(403).json({ success: false, error: 'Bu içerik için en fazla 3 yorum yazabilirsiniz' });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        contentId,
        episodeId: episodeId || null,
        text,
        hasSpoiler: hasSpoiler || false,
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        reactions: true,
      },
    });
    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Yorum oluşturulamadı' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({ success: false, error: 'Yorum bulunamadı' });
      return;
    }
    if (comment.userId !== userId && req.user!.role !== 'ADMIN' && req.user!.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Bu yorumu silme yetkiniz yok' });
      return;
    }
    await prisma.comment.update({ where: { id }, data: { isDeleted: true } });
    res.json({ success: true, message: 'Yorum silindi' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Yorum silinemedi' });
  }
});

// ── Reactions ──

router.post('/reactions/toggle', authenticate, async (req: AuthRequest, res) => {
  try {
    const { commentId, contentId, emoji } = req.body;
    const userId = req.user!.userId;
    if (!emoji) {
      res.status(400).json({ success: false, error: 'emoji gerekli' });
      return;
    }
    const existing = await prisma.reaction.findFirst({
      where: {
        userId,
        commentId: commentId || null,
        contentId: contentId || null,
        emoji,
      },
    });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { removed: true } });
    } else {
      const reaction = await prisma.reaction.create({
        data: {
          userId,
          commentId: commentId || null,
          contentId: contentId || null,
          emoji,
        },
      });
      res.json({ success: true, data: reaction });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Tepki değiştirilemedi' });
  }
});

router.get('/reactions/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const reactions = await prisma.reaction.findMany({
      where: { contentId },
      include: { user: { select: { id: true, username: true } } },
    });
    res.json({ success: true, data: reactions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Tepkiler yüklenemedi' });
  }
});

// ── Watch Parties ──

router.post('/party/create', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contentId } = req.body;
    const userId = req.user!.userId;
    if (!contentId) {
      res.status(400).json({ success: false, error: 'contentId gerekli' });
      return;
    }
    const party = await prisma.watchParty.create({
      data: { hostId: userId, contentId },
      include: {
        content: true,
        host: { select: { id: true, username: true, displayName: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
        },
      },
    });
    res.json({ success: true, data: party });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Parti oluşturulamadı' });
  }
});

router.get('/party/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const party = await prisma.watchParty.findUnique({
      where: { id },
      include: {
        content: true,
        host: { select: { id: true, username: true, displayName: true, avatar: true } },
        participants: {
          include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
        },
      },
    });
    if (!party) {
      res.status(404).json({ success: false, error: 'Parti bulunamadı' });
      return;
    }
    res.json({ success: true, data: party });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Parti yüklenemedi' });
  }
});

router.post('/party/:id/join', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const party = await prisma.watchParty.findUnique({ where: { id } });
    if (!party || !party.isActive) {
      res.status(404).json({ success: false, error: 'Aktif parti bulunamadı' });
      return;
    }
    const existing = await prisma.watchPartyParticipant.findFirst({
      where: { partyId: id, userId },
    });
    if (existing) {
      res.json({ success: true, data: existing });
      return;
    }
    const participant = await prisma.watchPartyParticipant.create({
      data: { partyId: id, userId },
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
    res.json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Partye katılınamadı' });
  }
});

router.post('/party/:id/leave', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    await prisma.watchPartyParticipant.deleteMany({
      where: { partyId: id, userId },
    });
    res.json({ success: true, message: 'Partiden ayrılındı' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Partiden ayrılamadı' });
  }
});

router.post('/party/:id/sync', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { progress, isPlaying } = req.body;
    const userId = req.user!.userId;
    const party = await prisma.watchParty.findUnique({ where: { id } });
    if (!party || party.hostId !== userId) {
      res.status(403).json({ success: false, error: 'Senkronizasyon yetkisi yok' });
      return;
    }
    res.json({ success: true, data: { partyId: id, progress, isPlaying, timestamp: new Date().toISOString() } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Senkronizasyon başarısız' });
  }
});

// ── Follow ──

router.post('/follow/toggle', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId: targetId } = req.body;
    const followerId = req.user!.userId;
    if (!targetId || targetId === followerId) {
      res.status(400).json({ success: false, error: 'Geçerli bir kullanıcı ID\'si gerekli' });
      return;
    }
    const existing = await prisma.follow.findFirst({
      where: { followerId, followingId: targetId },
    });
    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      res.json({ success: true, data: { followed: false } });
    } else {
      const follow = await prisma.follow.create({
        data: { followerId, followingId: targetId },
      });
      res.json({ success: true, data: { followed: true, ...follow } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'İşlem başarısız' });
  }
});

router.get('/followers', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, username: true, displayName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: followers });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Takipçiler yüklenemedi' });
  }
});

router.get('/following', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, username: true, displayName: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: following });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Takip edilenler yüklenemedi' });
  }
});

// ── User Stats & Achievements ──

router.get('/my-stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    let stats = await prisma.userStats.findUnique({ where: { userId } });
    if (!stats) {
      const watchHistory = await prisma.watchHistory.findMany({ where: { userId } });
      const moviesWatched = new Set(watchHistory.filter((w) => !w.episodeId).map((w) => w.contentId)).size;
      const episodesWatched = watchHistory.filter((w) => w.episodeId).length;
      const contentIds = Array.from(new Set(watchHistory.map((w) => w.contentId)));
      const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: { category: true },
      });
      const genreCounts: Record<string, number> = {};
      for (const c of contents) {
        if (c.category?.name) {
          genreCounts[c.category.name] = (genreCounts[c.category.name] || 0) + 1;
        }
      }
      const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const seriesIds = new Set(
        watchHistory.filter((w) => w.episodeId).map((w) => w.contentId)
      );
      stats = await prisma.userStats.create({
        data: {
          userId,
          totalWatchTime: watchHistory.length * 45,
          moviesWatched,
          seriesWatched: seriesIds.size,
          episodesWatched,
          topGenre,
          weeklyMinutes: Math.min(watchHistory.length * 45, 700),
          monthlyMinutes: Math.min(watchHistory.length * 45 * 4, 3000),
        },
      });
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'İstatistikler yüklenemedi' });
  }
});

router.get('/achievements', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const badges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    const watchHistory = await prisma.watchHistory.findMany({ where: { userId } });
    const allBadges: { type: string; earned: boolean; earnedAt?: string }[] = [
      { type: 'first_watch', earned: watchHistory.length >= 1, earnedAt: badges.find((b) => b.badgeType === 'first_watch')?.earnedAt.toISOString() },
      { type: 'movie_buff', earned: (stats?.moviesWatched || 0) >= 10, earnedAt: badges.find((b) => b.badgeType === 'movie_buff')?.earnedAt.toISOString() },
      { type: 'series_addict', earned: (stats?.episodesWatched || 0) >= 50, earnedAt: badges.find((b) => b.badgeType === 'series_addict')?.earnedAt.toISOString() },
      { type: 'night_owl', earned: watchHistory.length >= 20, earnedAt: badges.find((b) => b.badgeType === 'night_owl')?.earnedAt.toISOString() },
      { type: 'genre_explorer', earned: watchHistory.length >= 30, earnedAt: badges.find((b) => b.badgeType === 'genre_explorer')?.earnedAt.toISOString() },
      { type: 'social_butterfly', earned: false, earnedAt: badges.find((b) => b.badgeType === 'social_butterfly')?.earnedAt.toISOString() },
    ];

    for (const badge of allBadges) {
      if (badge.earned && !badges.find((b) => b.badgeType === badge.type)) {
        await prisma.userBadge.create({ data: { userId, badgeType: badge.type } });
      }
    }

    res.json({ success: true, data: allBadges });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Rozetler yüklenemedi' });
  }
});

// ──── ADMIN COMMENT ROUTES ────

// GET /admin/comments - List all comments with pagination + search
router.get('/admin/comments', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = req.query.search as string | undefined;
  const contentId = req.query.contentId as string | undefined;

  const where: any = {};
  if (contentId) where.contentId = contentId;
  if (search) {
    where.OR = [
      { text: { contains: search } },
      { user: { username: { contains: search } } },
      { user: { email: { contains: search } } },
    ];
  }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true, displayName: true, avatar: true } },
        content: { select: { id: true, title: true, type: true } },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}));

// DELETE /admin/comments/:id - Admin: soft-delete any comment
router.delete('/admin/comments/:id', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return res.status(404).json({ success: false, message: 'Yorum bulunamadi' });

  await prisma.comment.update({ where: { id }, data: { isDeleted: true } });
  res.json({ success: true, message: 'Yorum silindi' });
}));

// DELETE /admin/comments/:id/hard - Admin: permanently delete comment
router.delete('/admin/comments/:id/hard', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return res.status(404).json({ success: false, message: 'Yorum bulunamadi' });

  await prisma.reaction.deleteMany({ where: { commentId: id } });
  await prisma.comment.delete({ where: { id } });
  res.json({ success: true, message: 'Yorum kalici olarak silindi' });
}));

// GET /admin/comments/stats - Admin: comment statistics
router.get('/admin/comments/stats', authenticate, requireAdmin, asyncHandler(async (req: AuthRequest, res: Response) => {
  const [total, deleted, withSpoilers, today] = await Promise.all([
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.comment.count({ where: { isDeleted: true } }),
    prisma.comment.count({ where: { hasSpoiler: true, isDeleted: false } }),
    prisma.comment.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, isDeleted: false } }),
  ]);
  res.json({ success: true, data: { total, deleted, withSpoilers, today } });
}));

export default router;
