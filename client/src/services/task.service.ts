import apiService from './api.service';
import { Task } from '../types';

class TaskService {
  async createTask(
    title: string,
    teamId: string,
    description?: string,
    channelId?: string,
    assignedTo: string[] = [],
    priority: 'low' | 'medium' | 'high' = 'medium',
    dueDate?: string
  ): Promise<Task> {
    const response = await apiService.post<{ task: Task }>('/tasks', {
      title,
      description,
      teamId,
      channelId,
      assignedTo,
      priority,
      dueDate
    });
    
    if (response.success && response.data) {
      return response.data.task;
    }
    throw new Error(response.message || 'Failed to create task');
  }

  async getTeamTasks(teamId: string): Promise<Task[]> {
    const response = await apiService.get<{ tasks: Task[] }>(`/tasks/team/${teamId}`);
    if (response.success && response.data) {
      return response.data.tasks;
    }
    throw new Error(response.message || 'Failed to get tasks');
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await apiService.get<{ task: Task }>(`/tasks/${taskId}`);
    if (response.success && response.data) {
      return response.data.task;
    }
    throw new Error(response.message || 'Failed to get task');
  }

  async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: 'todo' | 'in-progress' | 'completed' | 'cancelled';
      priority?: 'low' | 'medium' | 'high';
      assignedTo?: string[];
      dueDate?: string;
    }
  ): Promise<Task> {
    const response = await apiService.put<{ task: Task }>(`/tasks/${taskId}`, data);
    if (response.success && response.data) {
      return response.data.task;
    }
    throw new Error(response.message || 'Failed to update task');
  }

  async deleteTask(taskId: string): Promise<void> {
    const response = await apiService.delete(`/tasks/${taskId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete task');
    }
  }
}

export default new TaskService();

