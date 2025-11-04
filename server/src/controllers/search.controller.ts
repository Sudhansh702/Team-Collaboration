import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { SearchService } from '../services/search.service';

export const search = async (
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

    const { q: query, type, teamId, channelId, startDate, endDate } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Parse date filters
    const filters: any = {};
    if (type && typeof type === 'string') {
      filters.type = type as 'messages' | 'channels' | 'teams' | 'all';
    }
    if (teamId && typeof teamId === 'string') {
      filters.teamId = teamId;
    }
    if (channelId && typeof channelId === 'string') {
      filters.channelId = channelId;
    }
    if (startDate && typeof startDate === 'string') {
      filters.startDate = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      filters.endDate = new Date(endDate);
    }

    const results = await SearchService.search(userId, query, filters);

    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    next(error);
  }
};


