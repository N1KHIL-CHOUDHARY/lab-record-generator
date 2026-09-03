'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function LoginPage() {
  const {
    user,
    loading: authLoading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const mapFirebaseError = (error: any): string => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please verify your details.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later or reset your password.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completing.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      default:
        return error?.message || 'Authentication failed. Please try again.';
    }
  };

  const handleTabSwitch = (targetMode: AuthMode) => {
    setMode(targetMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      setIsSubmitting(true);
      try {
        await sendPasswordReset(cleanEmail);
        setSuccessMessage(
          `A password reset link has been sent to ${cleanEmail}. Please check your inbox or spam folder.`
        );
      } catch (error: any) {
        console.error('Password reset failed:', error);
        setErrorMessage(mapFirebaseError(error));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
        return;
      }

      setIsSubmitting(true);
      try {
        await signUpWithEmail(cleanEmail, password, name.trim());
        router.push('/dashboard');
      } catch (error: any) {
        console.error('Sign up failed:', error);
        setErrorMessage(mapFirebaseError(error));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Sign In Mode
    setIsSubmitting(true);
    try {
      await signInWithEmail(cleanEmail, password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign in failed:', error);
      setErrorMessage(mapFirebaseError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      setErrorMessage(mapFirebaseError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#e8e3ff] text-[#14131b] selection:bg-purple-200 selection:text-purple-900">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(214,207,255,0.7) 0%, rgba(239,236,255,0.3) 50%, transparent 80%)',
        }}
      />

      {/* Header bar */}
      <header className="relative z-10 mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] transition hover:opacity-80"
        >
          <FlaskConical className="h-5 w-5 text-black" />
          <span>Labora</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-medium text-neutral-600 transition hover:text-neutral-900"
        >
          Back to Home
        </Link>
      </header>

      {/* Main card */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-8 shadow-[0_14px_50px_rgba(73,61,132,.12)] backdrop-blur-md transition-all duration-300">
          {/* Logo & Header Info */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl  text-black shadow-md">
              <FlaskConical className="h-6 w-6" />
            </div>

            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {mode === 'signin' && 'Welcome to Labora'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot' && 'Reset your password'}
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-neutral-500">
                {mode === 'signin' &&
                  'Sign in to access your lab workspace and generate records.'}
                {mode === 'signup' &&
                  'Join Labora to generate standardized, publication-ready lab records.'}
                {mode === 'forgot' &&
                  'Enter your email address and we will send you a password recovery link.'}
              </p>
            </motion.div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-6">
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => handleTabSwitch('signin')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 transition hover:text-neutral-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </button>
            ) : (
              <div className="relative flex rounded-xl bg-neutral-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signin')}
                  className={`relative z-10 flex-1 py-2 text-center transition-colors duration-200 ${
                    mode === 'signin'
                      ? 'text-neutral-900 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Sign In
                  {mode === 'signin' && (
                    <motion.div
                      layoutId="auth-tab-pill"
                      className="absolute inset-0 z-[-1] rounded-lg bg-white shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('signup')}
                  className={`relative z-10 flex-1 py-2 text-center transition-colors duration-200 ${
                    mode === 'signup'
                      ? 'text-neutral-900 font-bold'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Sign Up
                  {mode === 'signup' && (
                    <motion.div
                      layoutId="auth-tab-pill"
                      className="absolute inset-0 z-[-1] rounded-lg bg-white shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Alerts */}
          <AnimatePresence mode="popLayout">
            {errorMessage && (
              <motion.div
                key="error-alert"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                key="success-alert"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span className="leading-snug">{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <AnimatePresence mode="popLayout">
              {/* Full Name field (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  key="field-name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Full Name <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., John Doe"
                      autoComplete="name"
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                    />
                  </div>
                </motion.div>
              )}

              {/* Email field (All modes) */}
              <motion.div key="field-email" layout="position">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  />
                </div>
              </motion.div>

              {/* Password field (Sign In & Sign Up) */}
              {mode !== 'forgot' && (
                <motion.div
                  key="field-password"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleTabSwitch('forgot')}
                        className="text-[11px] font-semibold text-[#5845c4] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 transition"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Confirm Password field (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  key="field-confirm-password"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-neutral-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#111116] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-neutral-900/10 transition hover:bg-[#292632] active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
              )}
            </button>
          </form>

          {/* Social Provider (Google) - shown on signin & signup */}
          {mode !== 'forgot' && (
            <div>
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-white/95 px-3 font-semibold text-neutral-400">
                    or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || authLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* Footer toggle note */}
          <div className="mt-6 text-center text-xs text-neutral-500">
            {mode === 'signin' && (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signup')}
                  className="font-semibold text-[#5845c4] hover:underline"
                >
                  Create an account
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signin')}
                  className="font-semibold text-[#5845c4] hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signin')}
                  className="font-semibold text-[#5845c4] hover:underline"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-neutral-500">
        © {new Date().getFullYear()} Labora — Laboratory Record Generator
      </footer>
    </div>
  );
}
