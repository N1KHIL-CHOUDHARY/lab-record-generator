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
    
    } catch (err) {
      
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
  

    if (!isReadyRef.current || audioPoolRef.current.length === 0) {
    
      return;
    }

    try {
      const audio = audioPoolRef.current[poolIndexRef.current];
      poolIndexRef.current = (poolIndexRef.current + 1) % audioPoolRef.current.length;

      audio.volume = Math.max(0, Math.min(1, volume));
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
          
          })
          .catch((err) => {
          
          });
      }
    } catch (err) {
      
    }
  }, []);

  return { play };
}
