import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getFirebaseAuth, initFirebase } from '../config/firebase.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export interface AuthUserProfile {
  id: string;
  _id: string; // compatibility with existing frontend
  name: string;
  email: string | null;
  avatar: string | null;
  firebaseUid: string;
  createdAt: Date;
  updatedAt: Date;
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function authenticateWithGoogle(idToken: string): Promise<{
  user: AuthUserProfile;
  token: string;
}> {
  initFirebase();

  if (!env.firebase.projectId) {
    throw new AppError('Firebase not configured on server', 503);
  }

  let decoded;
  try {
    decoded = await getFirebaseAuth().verifyIdToken(idToken);
  } catch {
    throw new AppError('Invalid Firebase token', 401);
  }

  const email = decoded.email || null;
  let user = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
  });

  if (!user) {
    // If a user with the same email already exists under another UID, we handle gracefully
    user = await prisma.user.create({
      data: {
        firebaseUid: decoded.uid,
        name: decoded.name || 'User',
        email: email,
        avatar: decoded.picture || null,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: decoded.name || user.name,
        avatar: decoded.picture || user.avatar,
        ...(email ? { email } : {}),
      },
    });
  }

  const token = signToken(user.id);

  return {
    user: {
      ...user,
      _id: user.id,
    },
    token,
  };
}

export async function getUserProfile(userId: string): Promise<AuthUserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return {
    ...user,
    _id: user.id,
  };
}
