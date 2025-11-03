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
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/refresh-token` - Refresh JWT token

## Next Steps (Phase 2)

- Team CRUD operations
- Team member management
- Channel CRUD operations
- Channel membership
- Team settings and permissions

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

