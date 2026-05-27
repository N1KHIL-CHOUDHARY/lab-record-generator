import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateWithGoogle, getUserProfile } from '../services/authService.js';
import { AuthRequest } from '../middleware/auth.js';

export const googleAuth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { idToken } = req.body;
  const { user, token } = await authenticateWithGoogle(idToken);

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    },
  });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getUserProfile(req.userId!);

  res.status(200).json({
    success: true,
    data: {
      id: user?._id,
      name: user?.name,
      email: user?.email,
      avatar: user?.avatar,
    },
  });
});
