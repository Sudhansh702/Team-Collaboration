import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User.model';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and username are required'
      });
    }

    // Register user
    const user = await AuthService.registerUser(email, password, username);

    // Generate tokens
    const userId = (user._id as any).toString();
    const accessToken = AuthService.generateAccessToken({
      userId,
      email: user.email
    });
    const refreshToken = AuthService.generateRefreshToken({
      userId,
      email: user.email
    });

    // Return user data (without password)
    const userObj = user.toObject();
    delete userObj.password;
    // Ensure _id is a string
    if (userObj._id) {
      userObj._id = userObj._id.toString();
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userObj,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Login user
    const user = await AuthService.loginUser(email, password);

    // Update user status to online
    user.status = 'online';
    await user.save();

    // Generate tokens
    const userId = (user._id as any).toString();
    const accessToken = AuthService.generateAccessToken({
      userId,
      email: user.email
    });
    const refreshToken = AuthService.generateRefreshToken({
      userId,
      email: user.email
    });

    // Return user data (without password)
    const userObj = user.toObject();
    delete userObj.password;
    // Ensure _id is a string
    if (userObj._id) {
      userObj._id = userObj._id.toString();
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userObj,
        accessToken,
        refreshToken
      }
    });
  } catch (error: any) {
    if (
      error.message === 'Invalid email or password' ||
      error.message === 'User not found'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    next(error);
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (userId) {
      // Update user status to offline
      await User.findByIdAndUpdate(userId, { status: 'offline' });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Fetch fresh user data from database
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Convert to plain object with all fields
    const userObj: any = user.toObject ? user.toObject() : user;
    // Remove password if it exists (shouldn't since we used .select('-password'))
    if (userObj.password !== undefined) {
      delete userObj.password;
    }
    // Ensure _id is present as string
    if (userObj._id) {
      userObj._id = userObj._id.toString();
    }

    res.json({
      success: true,
      data: { user: userObj }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const { username, avatar, status } = req.body;

    // Debug logging
    console.log('Profile update request received:', {
      userId,
      bodyKeys: Object.keys(req.body),
      username: username !== undefined ? (username ? `${username.substring(0, 10)}...` : 'empty string') : 'undefined',
      avatar: avatar !== undefined ? (avatar ? `${avatar.substring(0, 30)}...` : 'empty string') : 'undefined',
      status: status || 'not provided'
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const updateData: any = {};
    
    // Build update object - only include fields that are provided
    if (username !== undefined && username !== null) {
      // Trim and validate username
      const trimmedUsername = String(username).trim();
      if (!trimmedUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username cannot be empty'
        });
      }
      updateData.username = trimmedUsername;
    }
    
    // Avatar can be empty string - explicitly allow it
    // Always update avatar if it's provided, even if empty string
    // Check if avatar key exists in request body (even if value is empty string)
    if ('avatar' in req.body) {
      // Allow empty string for avatar (user can clear their avatar)
      // Handle null/undefined as empty string
      const avatarValue = avatar !== null && avatar !== undefined 
        ? String(avatar).trim() 
        : '';
      updateData.avatar = avatarValue;
      console.log('Avatar will be updated to:', avatarValue || 'empty string');
    } else {
      console.log('Avatar not provided in request body');
    }
    
    // Status must be valid
    if (status !== undefined && status !== null) {
      const statusStr = String(status).toLowerCase();
      if (['online', 'offline', 'away', 'busy'].includes(statusStr)) {
        updateData.status = statusStr;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid status value. Must be one of: online, offline, away, busy'
        });
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided to update'
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Convert to plain object and ensure _id is string
    const userObj: any = user.toObject ? user.toObject() : user;
    // Remove password if it exists (shouldn't since we used .select('-password'))
    if (userObj.password !== undefined) {
      delete userObj.password;
    }
    if (userObj._id) {
      userObj._id = userObj._id.toString();
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: userObj }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    try {
      const decoded = AuthService.verifyRefreshToken(refreshToken);

      // Generate new access token
      const accessToken = AuthService.generateAccessToken({
        userId: decoded.userId,
        email: decoded.email
      });

      res.json({
        success: true,
        data: {
          accessToken
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  } catch (error) {
    next(error);
  }
};

