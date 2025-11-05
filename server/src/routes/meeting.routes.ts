import { Router } from 'express';
import {
  createMeeting,
  getTeamMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  startMeeting,
  joinMeeting,
  leaveMeeting
} from '../controllers/meeting.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createMeeting);
router.get('/team/:teamId', getTeamMeetings);
router.get('/:id', getMeeting);
router.put('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);
router.post('/:id/start', startMeeting);
router.post('/:id/join', joinMeeting);
router.post('/:id/leave', leaveMeeting);

export default router;

