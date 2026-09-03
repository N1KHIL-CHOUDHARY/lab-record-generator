'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  FlaskConical,
  FileEdit,
  History,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { isSoundMuted, toggleSoundMuted } from '@/lib/sound';

export default function Header({ check = true }: { check?: boolean } = {}) {
  const pathname = usePathname();
  const { user, loading, signOutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    setMuted(isSoundMuted());

    const handleMuteChange = () => {
      setMuted(isSoundMuted());
    };

    window.addEventListener('labora_sound_muted_change', handleMuteChange);
    window.addEventListener('storage', handleMuteChange);

    return () => {
      window.removeEventListener('labora_sound_muted_change', handleMuteChange);
      window.removeEventListener('storage', handleMuteChange);
    };
  }, []);

  const handleToggleMute = () => {
    const next = toggleSoundMuted();
    setMuted(next);
  };

  const isEditorActive = pathname === '/dashboard' || pathname === '/';
  const isHistoryActive = pathname.startsWith('/history');

  const getInitials = () => {
    if (!user) return 'U';
    if (user.displayName) {
      const parts = user.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.displayName.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-150 ${
        isDark
          ? 'bg-zinc-950/80 border-zinc-800/80 text-zinc-100'
          : 'bg-white/80 border-zinc-200 text-zinc-900'
      }`}
    >
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Tab Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex items-center gap-1.5">
                <FlaskConical className="h-5 w-5 dark:text-white text-black" />
            </div>
          </Link>

      
          <nav className="flex items-center gap-1 rounded-xl bg-zinc-100/80 p-1 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/60">
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isEditorActive
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Editor</span>
            </Link>

            <Link
              href="/history"
              id="tour-history-btn"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isHistoryActive
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>History</span>
            </Link>
          </nav>
        </div>

      
        <div className="flex items-center gap-2.5 sm:gap-3">
         
          {check && <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('labora_tour_completed');
                sessionStorage.setItem('labora_force_tour', 'true');
                window.dispatchEvent(new CustomEvent('labora_start_tour'));
              }
            }}
            title="Start Guided Tour"
            aria-label="Start Guided Tour"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 shadow-xs cursor-pointer"
          >
            <span className="hidden sm:inline">Tour</span>
          </button>}

          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={() => toggleTheme()}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 shadow-xs"
          >
            {isDark ? (
              <Sun className="h-4 w-4 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Mute / Unmute Sound Toggle Button */}
          <button
            onClick={handleToggleMute}
            title={muted ? 'Unmute UI sound' : 'Mute UI sound'}
            aria-label={muted ? 'Unmute UI sound' : 'Mute UI sound'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 shadow-xs"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          

          
          {loading ? (
            <div className="h-9 w-24 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border transition-all ${
                  isDark
                    ? 'border-zinc-700 bg-zinc-900'
                    : 'border-zinc-200 bg-zinc-100'
                }`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    {getInitials()}
                  </span>
                )}
              </div>

              {/* Subtle Sign Out Action Button */}
              <button
                onClick={() => signOutUser()}
                title="Sign Out"
                aria-label="Sign Out"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}