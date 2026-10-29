'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  Volume2,
  VolumeX,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { isSoundMuted, toggleSoundMuted } from '@/lib/sound';

export default function Header({ check = true }: { check?: boolean } = {}) {
  const pathname = usePathname();
  const { user, loading, signOutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [muted, setMuted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 ${
        isDark
          ? 'bg-neutral-950/80 border-neutral-800/80 text-white'
          : 'bg-white/80 border-neutral-200/70 text-neutral-900'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Tab Navigation */}
        <div className="flex items-center gap-5 sm:gap-7">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 transition-opacity hover:opacity-90 select-none"
          >
            <FlaskConical className="h-5 w-5 text-neutral-950 dark:text-white transition-transform group-hover:scale-105" />
            <span className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
              Labora
            </span>
          </Link>

          {/* Segmented Pill Navigation */}
          <nav className="flex items-center gap-1 rounded-full border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-100/80 dark:bg-neutral-900/80 p-0.5 shadow-inner">
            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                isEditorActive
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Editor</span>
            </Link>

            <Link
              href="/history"
              id="tour-history-btn"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                isHistoryActive
                  ? 'bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>History</span>
            </Link>
          </nav>
        </div>

        {/* Right: Controls & User Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={() => toggleTheme()}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle theme"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-300 shadow-2xs transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white active:scale-95 cursor-pointer"
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
            className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-300 shadow-2xs transition-all hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white active:scale-95 cursor-pointer"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          {/* User Profile / Auth Section */}
          {loading ? (
            <div className="h-8.5 w-8.5 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
          ) : user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full p-0.5 border border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition cursor-pointer select-none active:scale-95"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                title={user.displayName || user.email || 'User Account'}
              >
                <div className="flex h-7.5 w-7.5 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{getInitials()}</span>
                  )}
                </div>
                <ChevronDown
                  className={`h-3 w-3 text-neutral-400 mr-1 transition-transform duration-150 ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-2 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-800 mb-1">
                    <p className="text-xs font-semibold text-neutral-950 dark:text-white truncate">
                      {user.displayName || 'Lab Student'}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {user.email || 'No email attached'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      signOutUser();
                    }}
                    type="button"
                    className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-98 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 active:scale-95"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
