import { Router } from 'express';
import { downloadFile } from '../controllers/file.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// File download route
router.get('/:filename', downloadFile);

export default router;


