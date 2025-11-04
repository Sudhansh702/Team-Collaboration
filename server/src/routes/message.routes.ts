import { Router } from 'express';
import {
  createMessage,
  getChannelMessages,
  getMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction
} from '../controllers/message.controller';
import { uploadFileAndCreateMessage } from '../controllers/file.controller';
import { upload } from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Message routes
router.post('/', createMessage);
router.post('/upload', upload.single('file'), uploadFileAndCreateMessage);
router.get('/channel/:channelId', getChannelMessages);
router.get('/:id', getMessage);
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);
router.post('/:id/reactions', addReaction);
router.delete('/:id/reactions', removeReaction);

export default router;

