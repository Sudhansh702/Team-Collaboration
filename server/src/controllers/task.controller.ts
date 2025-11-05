import { Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ITask } from '../models/Task.model';

// Helper function to transform task for frontend (convert populated objects to string IDs)
const transformTask = (task: ITask | any): any => {
  const taskObj = task.toObject ? task.toObject() : task;
  
  return {
    ...taskObj,
    _id: taskObj._id?.toString() || taskObj._id,
    teamId: taskObj.teamId?._id?.toString() || taskObj.teamId?.toString() || taskObj.teamId,
    channelId: taskObj.channelId?._id?.toString() || taskObj.channelId?.toString() || taskObj.channelId || null,
    createdBy: taskObj.createdBy?._id?.toString() || taskObj.createdBy?.toString() || taskObj.createdBy,
    assignedTo: Array.isArray(taskObj.assignedTo)
      ? taskObj.assignedTo.map((item: any) => 
          item._id?.toString() || item.toString() || item
        )
      : [],
    createdAt: taskObj.createdAt?.toISOString() || taskObj.createdAt,
    updatedAt: taskObj.updatedAt?.toISOString() || taskObj.updatedAt,
    dueDate: taskObj.dueDate ? (taskObj.dueDate instanceof Date ? taskObj.dueDate.toISOString() : taskObj.dueDate) : undefined,
    completedAt: taskObj.completedAt ? (taskObj.completedAt instanceof Date ? taskObj.completedAt.toISOString() : taskObj.completedAt) : undefined,
  };
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { title, description, teamId, channelId, assignedTo, priority, dueDate } = req.body;

    if (!title || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Title and team ID are required'
      });
    }

    const task = await TaskService.createTask(
      title,
      description || '',
      teamId,
      userId,
      channelId,
      assignedTo || [],
      priority || 'medium',
      dueDate ? new Date(dueDate) : undefined
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: transformTask(task) }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'Channel not found or does not belong to this team' ||
      error.message === 'You are not a member of this team'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getTeamTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { teamId } = req.params;
    const tasks = await TaskService.getTeamTasks(teamId, userId);

    res.status(200).json({
      success: true,
      data: { tasks: tasks.map(transformTask) }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const task = await TaskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { task: transformTask(task) }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;

    const task = await TaskService.updateTask(id, userId, {
      title,
      description,
      status,
      priority,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: { task: transformTask(task) }
    });
  } catch (error: any) {
    if (
      error.message === 'Task not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to update this task'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    await TaskService.deleteTask(id, userId);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    if (
      error.message === 'Task not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to delete this task'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

