import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getFirebaseAuth, initFirebase } from '../config/firebase.js';
import { User, IUser } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

function signToken(userId: string): string {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export async function authenticateWithGoogle(idToken: string): Promise<{
  user: IUser;
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

  let user = await User.findOne({ firebaseUid: decoded.uid });

  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      name: decoded.name || 'User',
      email: decoded.email || '',
      avatar: decoded.picture,
    });
  } else {
    user.name = decoded.name || user.name;
    user.avatar = decoded.picture || user.avatar;
    await user.save();
  }

  const token = signToken(user._id.toString());

  return { user, token };
}

export async function getUserProfile(userId: string): Promise<IUser | null> {
  return User.findById(userId);
}
