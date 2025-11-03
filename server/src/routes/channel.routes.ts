import { Router } from 'express';
import {
  createChannel,
  getTeamChannels,
  getChannel,
  updateChannel,
  deleteChannel,
  addChannelMember,
  removeChannelMember
} from '../controllers/channel.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', createChannel);
router.get('/team/:teamId', getTeamChannels);
router.get('/:id', getChannel);
router.put('/:id', updateChannel);
router.delete('/:id', deleteChannel);

// Member management routes
router.post('/:id/members', addChannelMember);
router.delete('/:id/members/:userId', removeChannelMember);

export default router;

