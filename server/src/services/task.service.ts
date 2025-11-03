import Task, { ITask } from '../models/Task.model';
import Team from '../models/Team.model';
import Channel from '../models/Channel.model';

export class TaskService {
  static async createTask(
    title: string,
    description: string,
    teamId: string,
    userId: string,
    channelId?: string,
    assignedTo: string[] = [],
    priority: 'low' | 'medium' | 'high' = 'medium',
    dueDate?: Date
  ): Promise<ITask> {
    // Verify team exists and user is member
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some((m) => m.userId.toString() === userId);

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // Verify channel if provided
    if (channelId) {
      const channel = await Channel.findById(channelId);
      if (!channel || channel.teamId.toString() !== teamId) {
        throw new Error('Channel not found or does not belong to this team');
      }
    }

    const task = new Task({
      title,
      description,
      teamId,
      channelId,
      assignedTo: assignedTo.map(id => id as any),
      createdBy: userId,
      priority,
      dueDate,
      status: 'todo'
    });

    await task.save();
    await task.populate('createdBy', 'username email avatar');
    await task.populate('assignedTo', 'username email avatar');
    await task.populate('teamId', 'name');
    await task.populate('channelId', 'name');

    return task;
  }

  static async getTeamTasks(teamId: string, userId: string): Promise<ITask[]> {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some((m) => m.userId.toString() === userId);

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    const tasks = await Task.find({ teamId })
      .populate('createdBy', 'username email avatar')
      .populate('assignedTo', 'username email avatar')
      .populate('teamId', 'name')
      .populate('channelId', 'name')
      .sort({ createdAt: -1 });

    return tasks;
  }

  static async getTaskById(taskId: string, userId: string): Promise<ITask | null> {
    const task = await Task.findById(taskId)
      .populate('createdBy', 'username email avatar')
      .populate('assignedTo', 'username email avatar')
      .populate('teamId', 'name')
      .populate('channelId', 'name');

    if (!task) {
      return null;
    }

    const team = await Team.findById(task.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some((m) => m.userId.toString() === userId);

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    return task;
  }

  static async updateTask(
    taskId: string,
    userId: string,
    updateData: {
      title?: string;
      description?: string;
      status?: 'todo' | 'in-progress' | 'completed' | 'cancelled';
      priority?: 'low' | 'medium' | 'high';
      assignedTo?: string[];
      dueDate?: Date;
    }
  ): Promise<ITask> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const team = await Team.findById(task.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some((m) => m.userId.toString() === userId);
    const isAssigned = task.assignedTo.some((id) => id.toString() === userId);
    const isCreator = task.createdBy.toString() === userId;

    // Only creator, assigned user, or team admin/owner can update
    if (!isCreator && !isAssigned && !isOwner && !isMember) {
      throw new Error('You do not have permission to update this task');
    }

    if (updateData.title !== undefined) task.title = updateData.title;
    if (updateData.description !== undefined) task.description = updateData.description;
    if (updateData.status !== undefined) {
      task.status = updateData.status;
      if (updateData.status === 'completed') {
        task.completedAt = new Date();
      } else if (task.completedAt) {
        task.completedAt = undefined;
      }
    }
    if (updateData.priority !== undefined) task.priority = updateData.priority;
    if (updateData.assignedTo !== undefined) {
      task.assignedTo = updateData.assignedTo.map(id => id as any);
    }
    if (updateData.dueDate !== undefined) task.dueDate = updateData.dueDate;

    await task.save();
    await task.populate('createdBy', 'username email avatar');
    await task.populate('assignedTo', 'username email avatar');
    await task.populate('teamId', 'name');
    await task.populate('channelId', 'name');

    return task;
  }

  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const team = await Team.findById(task.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Only creator or team owner/admin can delete
    const isCreator = task.createdBy.toString() === userId;
    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find((m) => m.userId.toString() === userId);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isCreator && !isOwner && !isAdmin) {
      throw new Error('You do not have permission to delete this task');
    }

    await Task.findByIdAndDelete(taskId);
  }
}

