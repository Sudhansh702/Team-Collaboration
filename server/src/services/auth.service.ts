import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import User, { IUser } from '../models/User.model';

export interface ITokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateAccessToken(payload: ITokenPayload): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const expiresIn = (process.env.JWT_EXPIRE || '15m') as StringValue;
    const options: SignOptions = {
      expiresIn
    };
    return jwt.sign(payload, secret, options);
  }

  static generateRefreshToken(payload: ITokenPayload): string {
    const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    const expiresIn = (process.env.JWT_REFRESH_EXPIRE || '7d') as StringValue;
    const options: SignOptions = {
      expiresIn
    };
    return jwt.sign(payload, secret, options);
  }

  static verifyAccessToken(token: string): ITokenPayload {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret'
    ) as ITokenPayload;
  }

  static verifyRefreshToken(token: string): ITokenPayload {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || 'default-refresh-secret'
    ) as ITokenPayload;
  }

  static async registerUser(
    email: string,
    password: string,
    username: string
  ): Promise<IUser> {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      username
    });

    await user.save();
    return user;
  }

  static async loginUser(email: string, password: string): Promise<IUser> {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    return user;
  }
}

