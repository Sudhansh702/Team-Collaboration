import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  refreshToken,
  getUserById
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);
// Parameter routes should come last to avoid conflicts with literal routes
router.get('/:id', authenticate, getUserById);

export default router;

