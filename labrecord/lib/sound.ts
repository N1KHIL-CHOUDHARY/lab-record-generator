'use client';

const POOL_SIZE = 6;
let audioPool: HTMLAudioElement[] = [];
let poolIndex = 0;
let isInitialized = false;

function initPool() {
  if (isInitialized || typeof window === 'undefined') return;

  try {
    audioPool = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio('/click.mp3');
      audio.preload = 'auto';
      return audio;
    });
    isInitialized = true;
  } catch {
    // Gracefully handle environments where Audio is blocked/unavailable
  }
}

/**
 * Plays /click.mp3 with round-robin concurrency.
 */
export function playClickSound(volume = 0.35) {
  if (typeof window === 'undefined') return;

  if (!isInitialized) {
    initPool();
  }

  if (audioPool.length === 0) return;

  try {
    const sound = audioPool[poolIndex];
    poolIndex = (poolIndex + 1) % audioPool.length;

    sound.volume = Math.max(0, Math.min(1, volume));
    sound.currentTime = 0;

    const playPromise = sound.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Suppress browser autoplay rejections
      });
    }
  } catch {
    // Prevent UI interruption
  }
}