import { Router } from 'express';
import { contentController } from '../controllers/contentController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, contentController.getAll);
router.get('/audit', contentController.getAudit);
router.get('/categories', contentController.getCategories);
router.get('/featured', contentController.getFeatured);
router.get('/trending', contentController.getTrending);
router.get('/search', contentController.search);
router.get('/recommendations/:id', contentController.getRecommendations);
router.get('/slug/:slug', contentController.getBySlug);
router.get('/:id', contentController.getById);

export default router;
