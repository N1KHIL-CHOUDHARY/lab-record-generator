'use client';

let audioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let isFetching = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// Pre-fetch and decode your exact /click.mp3 into memory
async function loadAudioBuffer(ctx: AudioContext) {
  if (audioBuffer || isFetching) return;
  isFetching = true;

  try {
    const response = await fetch('/click.mp3');
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error('Failed to load /click.mp3 buffer:', err);
  } finally {
    isFetching = false;
  }
}

const MUTE_STORAGE_KEY = 'labora_sound_muted';

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    window.dispatchEvent(new Event('labora_sound_muted_change'));
  } catch {}
}

export function toggleSoundMuted(): boolean {
  const next = !isSoundMuted();
  setSoundMuted(next);
  return next;
}

/**
 * Plays your exact /click.mp3 file directly from decoded memory buffer.
 */
export async function playClickSound(volume = 0.35) {
  if (isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (!audioBuffer) {
      await loadAudioBuffer(ctx);
    }

    if (!audioBuffer) return;

    // Create a one-shot buffer source from your exact MP3 data
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
  } catch {
    // Suppress browser autoplay rejections
  }
}

// Preload the sound immediately on the client
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    () => {
      const ctx = getAudioContext();
      if (ctx && !audioBuffer) {
        loadAudioBuffer(ctx);
      }
    },
    { once: true }
  );
}