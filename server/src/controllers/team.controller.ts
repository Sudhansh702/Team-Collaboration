import { Response, NextFunction } from 'express';
import { TeamService } from '../services/team.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const createTeam = async (
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

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    const team = await TeamService.createTeam(name, description || '', userId);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: { team }
    });
  } catch (error: any) {
    if (error.message === 'Team with this name already exists') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getTeams = async (
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

    const teams = await TeamService.getUserTeams(userId);

    res.json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    next(error);
  }
};

export const getTeam = async (
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

    const { id } = req.params;
    const team = await TeamService.getTeamById(id, userId);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: { team }
    });
  } catch (error: any) {
    if (error.message === 'You are not a member of this team') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const updateTeam = async (
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

    const { id } = req.params;
    const { name, description, avatar } = req.body;

    const team = await TeamService.updateTeam(id, userId, {
      name,
      description,
      avatar
    });

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: { team }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to update this team'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const deleteTeam = async (
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

    const { id } = req.params;
    await TeamService.deleteTeam(id, userId);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'Only the team owner can delete this team'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const addMember = async (
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

    const { id } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const team = await TeamService.addMember(id, userId, email, role || 'member');

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { team }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'User not found' ||
      error.message === 'User is already a member of this team' ||
      error.message === 'You do not have permission to add members'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const removeMember = async (
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

    const { id, userId: memberIdToRemove } = req.params;

    const team = await TeamService.removeMember(id, userId, memberIdToRemove);

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: { team }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'Cannot remove the team owner' ||
      error.message === 'You do not have permission to remove members'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const updateMemberRole = async (
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

    const { id, userId: memberId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (admin or member) is required'
      });
    }

    const team = await TeamService.updateMemberRole(
      id,
      userId,
      memberId,
      role
    );

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: { team }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'Member not found' ||
      error.message === 'Cannot change the owner role' ||
      error.message === 'Only the team owner can update member roles'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

