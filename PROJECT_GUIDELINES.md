# TeamConnect Project Guidelines

This document contains project-wide guidelines and instructions that should be followed by all developers and AI assistants working on this project, regardless of which chat session is being used.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Principles](#architecture-principles)
3. [Coding Standards](#coding-standards)
4. [File Structure](#file-structure)
5. [API Conventions](#api-conventions)
6. [Database Guidelines](#database-guidelines)
7. [Security Requirements](#security-requirements)
8. [Testing Requirements](#testing-requirements)
9. [Documentation Standards](#documentation-standards)
10. [Git Workflow](#git-workflow)

## Project Overview

**TeamConnect** is a comprehensive team collaboration platform featuring:
- Real-time messaging
- Task management
- Video calls
- File sharing
- Team workspaces

### Tech Stack Summary
- **Frontend**: React 18, TypeScript, Vite, Material-UI, React Query, Socket.io-client
- **Backend**: Node.js, Express.js, TypeScript, MongoDB, Mongoose, Socket.io, JWT
- **Shared**: TypeScript types and utilities

## Architecture Principles

1. **Separation of Concerns**: Keep business logic separate from presentation and data access layers
2. **Type Safety**: Use TypeScript throughout the project for better type safety
3. **Reusability**: Share types and utilities through the `shared/` directory
4. **Real-time First**: Design features with real-time updates in mind using Socket.io
5. **Scalability**: Write code that can scale with the application's growth

## Coding Standards

### TypeScript Guidelines
- Always use explicit types; avoid `any` type
- Use interfaces from `shared/` for data structures used across frontend/backend
- Enable strict mode in TypeScript configuration
- Use enums for constants that are shared

### Frontend Guidelines (client/)

#### Component Structure
```typescript
// Preferred component structure
import React from 'react';
import { ComponentProps } from '@/shared/types';

interface MyComponentProps {
  // props definition
}

export const MyComponent: React.FC<MyComponentProps> = ({ prop1, prop2 }) => {
  // hooks
  // handlers
  // render
};
```

#### State Management
- Use React hooks (`useState`, `useEffect`, `useContext`) for local state
- Use React Query for server state and caching
- Consider Context API for global state that doesn't need persistence

#### Styling
- Use Material-UI components and theming
- Follow Material Design principles
- Ensure responsive design (mobile-first approach)
- Use consistent spacing and typography from theme

#### File Naming
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

### Backend Guidelines (server/)

#### Project Structure
```
server/
├── src/
│   ├── controllers/    # Request handlers
│   ├── services/       # Business logic
│   ├── models/         # Mongoose models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types (if not in shared)
│   └── config/         # Configuration files
```

#### Controller Pattern
```typescript
// Controller should be thin, delegate to services
export const userController = {
  async createUser(req: Request, res: Response) {
    try {
      const user = await userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};
```

#### Service Pattern
```typescript
// Services contain business logic
export const userService = {
  async createUser(userData: CreateUserDTO) {
    // Validation
    // Business logic
    // Database operations
    return await UserModel.create(userData);
  }
};
```

#### Error Handling
- Use try-catch blocks in async functions
- Return appropriate HTTP status codes
- Provide meaningful error messages
- Log errors for debugging (but don't expose sensitive info to client)

## File Structure

### Directory Organization
- Keep related files together
- Group by feature when it makes sense
- Keep utilities and helpers in separate folders
- Maintain consistency across the project

### Import Organization
```typescript
// 1. External libraries
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules (absolute imports)
import { User } from '@/shared/types';
import { apiService } from '@/services/api';

// 3. Relative imports
import { Header } from './Header';
import { Button } from '../components/Button';
```

## API Conventions

### RESTful Design
- Use proper HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Use plural nouns for resources: `/api/users`, `/api/teams`
- Use nested resources for relationships: `/api/teams/:teamId/members`
- Return consistent response formats

### Response Format
```typescript
// Success response
{
  "data": { /* resource data */ },
  "message": "Success message" // optional
}

// Error response
{
  "error": "Error message",
  "details": { /* optional error details */ }
}
```

### Status Codes
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Authentication
- Use JWT tokens for authentication
- Include token in Authorization header: `Bearer <token>`
- Implement token refresh mechanism
- Protect routes with authentication middleware

## Database Guidelines

### MongoDB Best Practices
- Use Mongoose for schema definition and validation
- Define indexes for frequently queried fields
- Use lean queries when full Mongoose documents aren't needed
- Implement proper error handling for database operations

### Schema Design
```typescript
// Example schema structure
const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  // ... other fields
}, {
  timestamps: true, // Adds createdAt and updatedAt
  versionKey: false
});
```

### Data Validation
- Validate at both schema level (Mongoose) and application level
- Sanitize user inputs
- Use Mongoose validators for format validation

## Security Requirements

### Data Protection
- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Encrypt sensitive data at rest
- Use HTTPS in production

### Input Validation
- Validate all user inputs
- Sanitize data to prevent injection attacks
- Use parameterized queries (Mongoose handles this)
- Implement rate limiting for API endpoints

### Authentication & Authorization
- Hash passwords using bcrypt (or similar)
- Implement proper session management
- Check permissions for all protected resources
- Use secure JWT signing and verification

## Testing Requirements

### Frontend Testing
- Write unit tests for utility functions
- Test React components with React Testing Library
- Test user interactions and workflows
- Mock API calls in tests

### Backend Testing
- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Test error scenarios
- Test authentication and authorization

### Test Organization
- Keep tests close to the code they test
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

## Documentation Standards

### Code Comments
- Comment complex logic and algorithms
- Use JSDoc for function documentation
- Keep comments up-to-date with code changes

### API Documentation
- Document all API endpoints
- Include request/response examples
- Document error responses
- Keep API docs synchronized with code

### README Files
- Keep project README up to date
- Document setup instructions
- Include examples and usage
- Document environment variables

## Git Workflow

### Commit Messages
Use clear, descriptive commit messages:
```
feat: Add user profile page
fix: Resolve socket connection issue
docs: Update API documentation
refactor: Improve error handling in services
test: Add tests for user authentication
```

### Branching Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Code Review
- All code should be reviewed before merging
- Check for security vulnerabilities
- Ensure tests pass
- Verify code follows these guidelines

## Environment Variables

Always use environment variables for:
- Database connection strings
- JWT secrets
- API keys
- External service URLs
- Feature flags

Document all required environment variables in `.env.example` files.

## Performance Considerations

- Optimize database queries (use indexes, lean queries)
- Implement pagination for large datasets
- Use React Query caching for API responses
- Lazy load components and routes
- Optimize images and assets
- Monitor and optimize bundle sizes

## Important Reminders

1. **Always check existing code** before implementing new features
2. **Maintain consistency** with existing patterns and conventions
3. **Test thoroughly** before marking work as complete
4. **Update documentation** when making significant changes
5. **Consider performance** implications of code changes
6. **Follow security best practices** at all times
7. **Use shared types** from `shared/` directory to maintain consistency

## Getting Help

- Review existing code for examples
- Check this guidelines document
- Refer to project documentation in markdown files
- Follow established patterns in the codebase

---

**Last Updated**: 2024-11-05

This document should be reviewed and updated as the project evolves.
