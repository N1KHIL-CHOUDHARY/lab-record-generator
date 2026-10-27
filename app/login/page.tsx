'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  FlaskConical
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
        return 'Too many failed attempts. Please try again later.';
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
        setSuccessMessage(`Reset link sent to ${cleanEmail}. Check your inbox.`);
      } catch (error: any) {
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
        setErrorMessage('Passwords do not match.');
        return;
      }

      setIsSubmitting(true);
      try {
        await signUpWithEmail(cleanEmail, password, name.trim());
        router.push('/dashboard');
      } catch (error: any) {
        setErrorMessage(mapFirebaseError(error));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmail(cleanEmail, password);
      router.push('/dashboard');
    } catch (error: any) {
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
      setErrorMessage(mapFirebaseError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white text-neutral-900 font-sans antialiased selection:bg-[#ddd6fe] selection:text-neutral-950">

      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: Landing Page Celestial Gradient Canvas
      ─────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 p-4">
        <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-[#f7f5fd] border border-[#ede9fe] p-10 flex flex-col justify-between shadow-sm">

          {/* Celestial Spheres & Ambient Lavender Radial Glow */}
          <div className="pointer-events-none absolute inset-0">
            {/* Center ambient haze */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[550px] rounded-full bg-gradient-to-tr from-[#ede8fc] via-white/80 to-[#f3efff] blur-3xl opacity-80" />

            {/* Top-Right Celestial Sphere */}
            <div className="absolute -top-16 -right-16 h-80 w-80 rounded-full bg-gradient-to-br from-white via-[#e8e2fa] to-[#d8cef6] shadow-[inset_-16px_-16px_50px_rgba(147,126,220,0.35),0_20px_50px_rgba(180,165,240,0.25)] opacity-85" />

            {/* Bottom-Left Celestial Sphere */}
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-gradient-to-tr from-[#d5caf5] via-[#ece7fc] to-white shadow-[inset_16px_16px_50px_rgba(135,110,215,0.3),0_20px_60px_rgba(165,145,235,0.2)] opacity-80" />

            {/* Small Floating Satellite Orb */}
            <div className="absolute top-1/3 left-14 h-12 w-12 rounded-full bg-gradient-to-br from-white via-[#eee9fc] to-[#d6cbfa] shadow-[inset_-3px_-3px_8px_rgba(140,118,215,0.35),0_8px_20px_rgba(165,145,235,0.2)]" />
          </div>

          {/* Top Logo */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
             <FlaskConical className='h-6 w-6 text-neutral-900'/>
            </Link>
          </div>

          {/* Bottom Caption */}
          
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: Clean Auth Area
      ─────────────────────────────────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-between p-6 sm:p-12 lg:p-16">

        <div />

        {/* Center Container: Brand Title + Floating Card */}
        <div className="mx-auto w-full max-w-[380px] my-auto py-8">

          {/* Brand Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-neutral-950">
              Labora
            </h1>
          </div>

          {/* Floating Form Card */}
          <div className="rounded-3xl border border-neutral-100 bg-white p-7 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">

            {/* Card Header Title */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-neutral-950">
                {mode === 'signin' && 'Log In'}
                {mode === 'signup' && 'Sign Up'}
                {mode === 'forgot' && 'Reset Password'}
              </h3>
            </div>

            {/* Error / Success Notifications */}
            <AnimatePresence mode="popLayout">
              {errorMessage && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name (Signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nikhil"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 transition-all focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 transition-all focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15"
                />
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-neutral-500">
                      Your password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleTabSwitch('forgot')}
                        className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 pr-9 text-xs text-neutral-900 transition-all focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (Signup only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-900 transition-all focus:border-[#7c3aed] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] py-3 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-[#5b21b6] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {mode === 'signin' && 'Log In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot' && 'Send Reset Email'}
                  </span>
                )}
              </button>
            </form>

            {/* Google Authentication */}
            {mode !== 'forgot' && (
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting || authLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}

            {/* Bottom Toggle Note */}
            <div className="mt-5 pt-3 border-t border-neutral-100 text-center text-xs text-neutral-500">
              {mode === 'signin' && (
                <p>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('signup')}
                    className="font-semibold text-[#6d28d9] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabSwitch('signin')}
                    className="font-semibold text-[#6d28d9] hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => handleTabSwitch('signin')}
                  className="font-semibold text-[#6d28d9] hover:underline cursor-pointer"
                >
                  ← Back to Log In
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>All Rights 2026</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-neutral-700 transition">
              Terms of Use
            </Link>
            <Link href="/" className="hover:text-neutral-700 transition">
              Privacy Policy
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}