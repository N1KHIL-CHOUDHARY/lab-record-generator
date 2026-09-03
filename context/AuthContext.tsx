'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any legacy demo/mock auth data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo_auth_user');
    }

    if (!auth || !isFirebaseConfigured) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ensureAuth = () => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error(
        'Firebase is not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables in .env.local.'
      );
    }
    return auth;
  };

  const signInWithGoogle = async () => {
    const authInstance = ensureAuth();
    const result = await signInWithPopup(authInstance, googleProvider);
    if (result.user) {
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const authInstance = ensureAuth();
    const credential = await createUserWithEmailAndPassword(authInstance, email.trim(), pass);
    if (name && name.trim() && credential.user) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }
    if (credential.user) {
      setUser({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: (name && name.trim()) || credential.user.displayName || null,
        photoURL: credential.user.photoURL,
      });
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const authInstance = ensureAuth();
    const credential = await signInWithEmailAndPassword(authInstance, email.trim(), pass);
    if (credential.user) {
      setUser({
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName,
        photoURL: credential.user.photoURL,
      });
    }
  };

  const sendPasswordReset = async (email: string) => {
    const authInstance = ensureAuth();
    await sendPasswordResetEmail(authInstance, email.trim());
  };

  const signOutUser = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Firebase Sign-Out Error:', error);
      }
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
