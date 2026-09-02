'use client';

import { useCallback, useEffect, useRef } from 'react';

const POOL_SIZE = 5;

export function useSound(soundPath: string = '/click.mp3') {
  const audioPoolRef = useRef<HTMLAudioElement[]>([]);
  const poolIndexRef = useRef(0);
  const isReadyRef = useRef(false);

  useEffect(() => {
    try {
      audioPoolRef.current = Array.from({ length: POOL_SIZE }, () => {
        const audio = new Audio(soundPath);
        audio.preload = 'auto';
        return audio;
      });
      isReadyRef.current = true;
      console.log(`[useSound] Initialized audio pool (${POOL_SIZE} nodes) for: ${soundPath}`);
    } catch (err) {
      console.error('[useSound] Failed to initialize audio pool:', err);
    }

    return () => {
      audioPoolRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioPoolRef.current = [];
      isReadyRef.current = false;
    };
  }, [soundPath]);

  const play = useCallback((volume: number = 0.4) => {
    try {
      if (!isReadyRef.current || audioPoolRef.current.length === 0) {
        const fallback = new Audio(soundPath);
        fallback.volume = Math.max(0, Math.min(1, volume));
        fallback.play().catch(() => {});
        return;
      }

      const audio = audioPoolRef.current[poolIndexRef.current];
      poolIndexRef.current = (poolIndexRef.current + 1) % audioPoolRef.current.length;

      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (err) {
        console.error('[useSound] Unexpected error during audio playback:', err);
    }
  }, [soundPath]);

  return { play };
}
