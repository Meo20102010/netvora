import { Router } from 'express';
import { searchController } from '../controllers/searchController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, searchController.search);
router.get('/filter', optionalAuth, searchController.filter);
router.get('/suggestions', optionalAuth, searchController.suggestions);

export default router;
