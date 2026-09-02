'use client';

import { useEffect, useRef } from 'react';
import { playClickSound } from '@/lib/sound';

export default function ClickSoundListener() {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      // 60ms debounce to prevent dual events (e.g. pointerdown + touch/click echoes)
      const now = Date.now();
      if (now - lastPlayedRef.current < 60) return;

      const target = event.target as Element | null;
      if (!target) return;

      // Capture buttons, links, toggles, switches, tabs, and checkboxes
      const clickableElement = target.closest(
        'button, a, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], input[type="submit"], input[type="checkbox"], input[type="radio"], label[for]'
      );

      if (!clickableElement) return;

      // Skip disabled elements
      const isDisabled =
        clickableElement.hasAttribute('disabled') ||
        clickableElement.getAttribute('aria-disabled') === 'true' ||
        clickableElement.classList.contains('disabled');

      if (!isDisabled) {
        lastPlayedRef.current = now;
        playClickSound(0.22);
      }
    };

    // Use capture phase to ensure it triggers before any stopPropagation() calls
    document.addEventListener('pointerdown', handlePointerDown, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  return null;
}