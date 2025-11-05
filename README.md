# TeamConnect - Smart Team Collaboration Platform

A comprehensive team collaboration platform with real-time messaging, task management, video calls, and more.

## Project Structure

```
teamconnect/
├── client/          # React frontend
├── server/          # Node.js backend
└── shared/          # Shared TypeScript types
```

## Tech Stack

### Backend
- Node.js with Express.js
- TypeScript
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT for authentication

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Material-UI for components
- React Router for routing
- Socket.io-client for real-time features
- React Query for data fetching

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/teamconnect
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

4. Start the server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## Phase 1 Status: ✅ Complete

### Implemented Features
- ✅ Project setup (frontend + backend)
- ✅ Database connection and all models (User, Team, Channel, Message, Task, Meeting, Notification)
- ✅ Authentication system (register/login/logout)
- ✅ JWT token-based authentication with refresh tokens
- ✅ Basic routing and protected routes
- ✅ User profile management (view and update profile)
- ✅ React frontend with Material-UI
- ✅ Authentication context and services

### API Endpoints Available

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user
- `GET /api/auth/:id` - Get user by ID (for fetching other users' info)
- `PUT /api/auth/profile` - Update user profile

## Phase 2 Status: ✅ Complete

### Implemented Features
- ✅ Team CRUD operations (create, read, update, delete)
- ✅ Team member management (add, remove, update roles)
- ✅ Channel CRUD operations (create public/private channels)
- ✅ Channel membership management
- ✅ Team settings page with General and Members tabs
- ✅ Workspace page with channel sidebar

### API Endpoints Available

#### Teams (`/api/teams`)
- `POST /api/teams` - Create team
- `GET /api/teams` - Get user's teams
- `GET /api/teams/:id` - Get team by ID
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add member
- `DELETE /api/teams/:id/members/:userId` - Remove member
- `PUT /api/teams/:id/members/:userId/role` - Update member role

#### Channels (`/api/channels`)
- `POST /api/channels` - Create channel
- `GET /api/channels/team/:teamId` - Get team channels
- `GET /api/channels/:id` - Get channel by ID
- `PUT /api/channels/:id` - Update channel
- `DELETE /api/channels/:id` - Delete channel
- `POST /api/channels/:id/members` - Add member to channel
- `DELETE /api/channels/:id/members/:userId` - Remove member from channel

## Phase 3 Status: ✅ Complete

### Implemented Features
- ✅ Real-time messaging with Socket.io
- ✅ Messages CRUD operations (create, read, update, delete)
- ✅ Message reactions (add/remove emoji reactions)
- ✅ Typing indicators
- ✅ Tasks management (create, assign, track status, priority)
- ✅ Meetings scheduling (create, update, manage participants)
- ✅ Notifications system (create, read, mark as read, delete)
- ✅ Socket.io real-time updates for messages

### API Endpoints Available

#### Messages (`/api/messages`)
- `POST /api/messages` - Create message
- `GET /api/messages/channel/:channelId` - Get channel messages
- `GET /api/messages/:id` - Get message by ID
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message
- `POST /api/messages/:id/reactions` - Add reaction
- `DELETE /api/messages/:id/reactions` - Remove reaction

#### Tasks (`/api/tasks`)
- `POST /api/tasks` - Create task
- `GET /api/tasks/team/:teamId` - Get team tasks
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

#### Meetings (`/api/meetings`)
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/team/:teamId` - Get team meetings
- `GET /api/meetings/:id` - Get meeting by ID
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

#### Notifications (`/api/notifications`)
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Socket.io Events
- `join-channel` / `leave-channel` - Channel room management
- `send-message` / `new-message` - Real-time messaging
- `typing-start` / `typing-stop` / `user-typing` - Typing indicators
- `add-reaction` / `remove-reaction` / `message-updated` - Message reactions
- `update-message` / `delete-message` - Message updates

## Phase 4 Status: ✅ Complete

### Implemented Features
- ✅ File upload and sharing (backend + frontend)
- ✅ Search functionality (backend + frontend)
- ✅ Advanced notifications UI (bell icon, dropdown, filters, real-time updates)
- ✅ Analytics and reporting (dashboard, statistics, tables)

### API Endpoints Available

#### File Upload (`/api/messages`)
- `POST /api/messages/upload` - Upload file and create message
- `GET /api/files/:filename` - Download file

#### Search (`/api/search`)
- `GET /api/search?q=query&type=all&teamId=...&channelId=...` - Search messages, channels, teams

## Phase 5 Status: ✅ Complete

### Implemented Features
- ✅ Voice/video calls using WebRTC
- ✅ Call signaling via Socket.io
- ✅ Call UI components (CallWindow, IncomingCallModal)
- ✅ Call integration with workspace
- ✅ Call controls (mute, video toggle, hang up)
- ✅ Real-time call management

### Socket.io Call Events
- `call-initiate` / `incoming-call` - Call initiation
- `call-answer` / `call-answered` - Call answering
- `call-reject` / `call-rejected` - Call rejection
- `call-end` / `call-ended` - Call ending
- `offer` / `answer` / `ice-candidate` - WebRTC signaling

## Phase 6 Status: ✅ Complete

### Implemented Features
- ✅ Task Management UI (create, edit, delete tasks)
- ✅ Task list with filtering and search
- ✅ Task cards with status, priority, due date
- ✅ Task integration in workspace with tabs
- ✅ Task assignment to team members
- ✅ Task status and priority management
- ✅ Automatic notification generation for tasks
- ✅ Automatic notification generation for team events
- ✅ @mention detection in messages
- ✅ Automatic notification generation for meetings
- ✅ Real-time notifications via Socket.io

### Optional Enhancements (Future)
- ⏳ Enhanced analytics with charts
- ⏳ UI/UX improvements (dark mode, etc.)

### API Endpoints Available

#### Tasks (`/api/tasks`)
- `POST /api/tasks` - Create task
- `GET /api/tasks/team/:teamId` - Get team tasks
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Development

### Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Variables

See `.env.example` files in both `client/` and `server/` directories for required environment variables.

## License

This project is part of a college project.

