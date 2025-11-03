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
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;

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

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (status && ['online', 'offline', 'away', 'busy'].includes(status)) {
      updateData.status = status;
    }

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

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
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

