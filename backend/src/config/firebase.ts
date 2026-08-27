import admin from 'firebase-admin';
import { env } from './env.js';
import { AppError } from '../utils/AppError.js';

let initialized = false;

export function initFirebase(): void {
  if (initialized || !env.firebase.projectId) {
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });

    initialized = true;
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
  }
}

export function getFirebaseAuth(): admin.auth.Auth {
  if (!initialized) {
    throw new AppError('Firebase Admin not initialized. Check server credentials.', 503);
  }
  return admin.auth();
}
