import admin from 'firebase-admin';
import { env } from './env.js';

let initialized = false;

export function initFirebase(): void {
  if (initialized || !env.firebase.projectId) {
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });

  initialized = true;
}

export function getFirebaseAuth(): admin.auth.Auth {
  if (!initialized) {
    throw new Error('Firebase Admin not initialized');
  }
  return admin.auth();
}
