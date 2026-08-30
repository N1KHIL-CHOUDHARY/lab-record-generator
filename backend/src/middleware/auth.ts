import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export interface AuthRequest extends Request {
  user?: any;
  userId?: string;
}

interface JwtPayload {
  userId: string;
}

export const protect = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Not authorized — no token', 401);
    }

    const token = authHeader.split(' ')[1];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    } catch {
      throw new AppError('Not authorized — invalid token', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    req.user = user;
    req.userId = user.id;
    next();
  }
);
