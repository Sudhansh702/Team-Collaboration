export interface User {
  _id: string;
  email: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  members: TeamMember[];
  channels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Channel {
  _id: string;
  name: string;
  description?: string;
  teamId: string;
  type: 'public' | 'private';
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  channelId: string;
  senderId: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'link';
  fileUrl?: string;
  fileSize?: number;
  fileName?: string;
  replyTo?: string;
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  teamId: string;
  channelId?: string;
  assignedTo: string[];
  createdBy: string;
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  teamId: string;
  organizerId: string;
  participants: string[];
  startTime: string;
  endTime: string;
  meetingLink?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'message' | 'task' | 'meeting' | 'team_invite' | 'mention';
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

