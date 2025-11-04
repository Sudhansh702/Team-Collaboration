import { Router } from 'express';
import { search } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Search route
router.get('/', search);

export default router;


