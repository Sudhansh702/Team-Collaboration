import { Router } from 'express';
import {
  createTask,
  getTeamTasks,
  getTask,
  updateTask,
  deleteTask
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createTask);
router.get('/team/:teamId', getTeamTasks);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;

