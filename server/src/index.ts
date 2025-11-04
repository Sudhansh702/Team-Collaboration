import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import channelRoutes from './routes/channel.routes';
import messageRoutes from './routes/message.routes';
import taskRoutes from './routes/task.routes';
import meetingRoutes from './routes/meeting.routes';
import notificationRoutes from './routes/notification.routes';
import fileRoutes from './routes/file.routes';
import searchRoutes from './routes/search.routes';
import { errorHandler } from './middleware/errorHandler';

// WebRTC type definitions for Node.js
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

dotenv.config();

// Allow all origins - can be restricted via CORS_ORIGIN env variable if needed
const allowAllOrigins = process.env.CORS_ORIGIN !== 'false';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowAllOrigins 
      ? (origin, callback) => {
          // Allow all origins when CORS_ORIGIN is not set to 'false'
          callback(null, true);
        }
      : (origin, callback) => {
          // If CORS_ORIGIN is set to 'false', use the environment variable list
          if (!origin) return callback(null, true);
          
          const allowedOrigins = process.env.CLIENT_URL 
            ? process.env.CLIENT_URL.split(',').map(url => url.trim())
            : ['http://localhost:3000', 'http://localhost:3003'];
          const isAllowed = allowedOrigins.some(allowed => origin === allowed || allowed === '*');
          if (isAllowed) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware

app.use(cors({
  origin: allowAllOrigins 
    ? (origin, callback) => {
        // Allow all origins when CORS_ORIGIN is not set to 'false'
        callback(null, true);
      }
    : (origin, callback) => {
        // If CORS_ORIGIN is set to 'false', use the environment variable list
        const allowedOrigins = process.env.CLIENT_URL 
          ? process.env.CLIENT_URL.split(',').map(url => url.trim())
          : ['http://localhost:3000', 'http://localhost:3003'];
        
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 204 // Respond with 204 for preflight requests
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
// IMPORTANT: This must be before authentication middleware to allow public access
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const path = require('path');
const absoluteUploadDir = path.resolve(uploadDir);
console.log('Serving static files from:', absoluteUploadDir);
app.use('/uploads', express.static(absoluteUploadDir, {
  setHeaders: (res, path, stat) => {
    // Set CORS headers for images - allow both ports
    const origin = res.req?.headers?.origin;
    if (origin && (origin.includes('localhost:3000') || origin.includes('localhost:3003'))) {
      res.set('Access-Control-Allow-Origin', origin);
    } else {
      res.set('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
    }
    res.set('Access-Control-Allow-Credentials', 'true');
  }
}));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teamconnect')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join channel room when user selects a channel
  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel:${channelId}`);
    console.log(`User ${socket.id} joined channel: ${channelId}`);
  });

  // Leave channel room
  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
    console.log(`User ${socket.id} left channel: ${channelId}`);
  });

  // Join notifications room
  socket.on('join-notifications', (userId: string) => {
    socket.join(`notifications:${userId}`);
    console.log(`User ${socket.id} joined notifications room for user: ${userId}`);
  });

  // Leave notifications room
  socket.on('leave-notifications', (userId: string) => {
    socket.leave(`notifications:${userId}`);
    console.log(`User ${socket.id} left notifications room for user: ${userId}`);
  });

  // Send message (broadcast to channel)
  socket.on('send-message', async (data: {
    channelId: string;
    senderId: string;
    content: string;
    type?: 'text' | 'file' | 'image' | 'link';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    replyTo?: string;
  }) => {
    try {
      // Import here to avoid circular dependency
      const { MessageService } = await import('./services/message.service');
      
      // Create message in database
      const message = await MessageService.createMessage(
        data.channelId,
        data.senderId,
        data.content,
        data.type || 'text',
        data.fileUrl,
        data.fileName,
        data.fileSize,
        data.replyTo
      );

      // Convert to plain object to ensure all fields (including _id) are serialized
      const messageObj = message.toObject ? message.toObject() : message;
      // Ensure senderId._id is string if it's populated
      if (messageObj.senderId && typeof messageObj.senderId === 'object' && messageObj.senderId._id) {
        messageObj.senderId._id = messageObj.senderId._id.toString();
      }

      // Broadcast message to all users in the channel
      io.to(`channel:${data.channelId}`).emit('new-message', messageObj);
    } catch (error: any) {
      socket.emit('message-error', { error: error.message });
    }
  });

  // Typing indicator
  socket.on('typing-start', (data: { channelId: string; userId: string; username: string }) => {
    socket.to(`channel:${data.channelId}`).emit('user-typing', {
      userId: data.userId,
      username: data.username,
      channelId: data.channelId
    });
  });

  socket.on('typing-stop', (data: { channelId: string; userId: string }) => {
    socket.to(`channel:${data.channelId}`).emit('user-stopped-typing', {
      userId: data.userId,
      channelId: data.channelId
    });
  });

  // Message reactions
  socket.on('add-reaction', async (data: { messageId: string; userId: string; emoji: string; channelId: string }) => {
    try {
      const { MessageService } = await import('./services/message.service');
      const message = await MessageService.addReaction(data.messageId, data.userId, data.emoji);
      // Convert to plain object to ensure all fields are serialized
      const messageObj = message.toObject ? message.toObject() : message;
      if (messageObj.senderId && typeof messageObj.senderId === 'object' && messageObj.senderId._id) {
        messageObj.senderId._id = messageObj.senderId._id.toString();
      }
      io.to(`channel:${data.channelId}`).emit('message-updated', messageObj);
    } catch (error: any) {
      socket.emit('message-error', { error: error.message });
    }
  });

  socket.on('remove-reaction', async (data: { messageId: string; userId: string; emoji?: string; channelId: string }) => {
    try {
      const { MessageService } = await import('./services/message.service');
      const message = await MessageService.removeReaction(data.messageId, data.userId, data.emoji);
      // Convert to plain object to ensure all fields are serialized
      const messageObj = message.toObject ? message.toObject() : message;
      if (messageObj.senderId && typeof messageObj.senderId === 'object' && messageObj.senderId._id) {
        messageObj.senderId._id = messageObj.senderId._id.toString();
      }
      io.to(`channel:${data.channelId}`).emit('message-updated', messageObj);
    } catch (error: any) {
      socket.emit('message-error', { error: error.message });
    }
  });

  // Message updates
  socket.on('update-message', async (data: { messageId: string; userId: string; content: string; channelId: string }) => {
    try {
      const { MessageService } = await import('./services/message.service');
      const message = await MessageService.updateMessage(data.messageId, data.userId, data.content);
      // Convert to plain object to ensure all fields are serialized
      const messageObj = message.toObject ? message.toObject() : message;
      if (messageObj.senderId && typeof messageObj.senderId === 'object' && messageObj.senderId._id) {
        messageObj.senderId._id = messageObj.senderId._id.toString();
      }
      io.to(`channel:${data.channelId}`).emit('message-updated', messageObj);
    } catch (error: any) {
      socket.emit('message-error', { error: error.message });
    }
  });

  // Message deletion
  socket.on('delete-message', async (data: { messageId: string; userId: string; channelId: string }) => {
    try {
      const { MessageService } = await import('./services/message.service');
      await MessageService.deleteMessage(data.messageId, data.userId);
      io.to(`channel:${data.channelId}`).emit('message-deleted', { messageId: data.messageId });
    } catch (error: any) {
      socket.emit('message-error', { error: error.message });
    }
  });

  // Call signaling events for WebRTC
  socket.on('call-initiate', (data: { 
    from: string; 
    to: string; 
    callType: 'audio' | 'video';
    teamId?: string;
  }) => {
    console.log(`Call initiated from ${data.from} to ${data.to}`);
    // Send call notification to the recipient
    socket.to(`user:${data.to}`).emit('incoming-call', {
      from: data.from,
      callType: data.callType,
      teamId: data.teamId
    });
  });

  socket.on('call-answer', (data: { 
    from: string; 
    to: string; 
    answer: RTCSessionDescriptionInit;
  }) => {
    console.log(`Call answered by ${data.from}`);
    socket.to(`user:${data.to}`).emit('call-answered', {
      from: data.from,
      answer: data.answer
    });
  });

  socket.on('call-reject', (data: { 
    from: string; 
    to: string; 
  }) => {
    console.log(`Call rejected by ${data.from}`);
    socket.to(`user:${data.to}`).emit('call-rejected', {
      from: data.from
    });
  });

  socket.on('call-end', (data: { 
    from: string; 
    to: string; 
  }) => {
    console.log(`Call ended by ${data.from}`);
    socket.to(`user:${data.to}`).emit('call-ended', {
      from: data.from
    });
  });

  // WebRTC signaling
  socket.on('offer', (data: { 
    from: string;
    to: string; 
    offer: RTCSessionDescriptionInit;
  }) => {
    socket.to(`user:${data.to}`).emit('offer', {
      from: data.from,
      offer: data.offer
    });
  });

  socket.on('answer', (data: { 
    from: string;
    to: string; 
    answer: RTCSessionDescriptionInit;
  }) => {
    socket.to(`user:${data.to}`).emit('answer', {
      from: data.from,
      answer: data.answer
    });
  });

  socket.on('ice-candidate', (data: { 
    from: string;
    to: string; 
    candidate: RTCIceCandidateInit;
  }) => {
    socket.to(`user:${data.to}`).emit('ice-candidate', {
      from: data.from,
      candidate: data.candidate
    });
  });

  // Join user room for call signaling
  socket.on('join-user-room', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`User ${socket.id} joined user room: ${userId}`);
  });

  // Leave user room
  socket.on('leave-user-room', (userId: string) => {
    socket.leave(`user:${userId}`);
    console.log(`User ${socket.id} left user room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(errorHandler);

// Export io for use in controllers
export { io };

const PORT = parseInt(process.env.PORT || '5555', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces for network access

httpServer.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  if (HOST === '0.0.0.0') {
    console.log(`Server is accessible from network at http://192.168.1.4:${PORT}`);
  }
});

