import { Router } from 'express';
import {
  createMeeting,
  getTeamMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting
} from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createMeeting);
router.get('/team/:teamId', getTeamMeetings);
router.get('/:id', getMeeting);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

export default router;

