'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { playClickSound } from '@/lib/sound';

export default function ClickSoundListener() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (!pathname) return;

    // Active on dashboard, history, and workspace routes
    const isAllowedPage =
      pathname.startsWith('/dashboard') || pathname.startsWith('/history');

    if (!user || !isAllowedPage) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      // Match native buttons, ARIA buttons, switches, theme toggles, and form submitters
      const clickableElement = target.closest(
        'button, [role="button"], [role="switch"], input[type="checkbox"], input[type="submit"], label[for]'
      );

      if (!clickableElement) return;

      // Skip disabled buttons or explicitly aria-disabled elements
      const isDisabled =
        clickableElement.hasAttribute('disabled') ||
        clickableElement.getAttribute('aria-disabled') === 'true' ||
        clickableElement.classList.contains('disabled');

      if (!isDisabled) {
        playClickSound(0.35);
      }
    };

    // Use pointerdown with capture to trigger instantly before React synthetic events
    document.addEventListener('pointerdown', handlePointerDown, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [user, pathname]);

  return null;
}