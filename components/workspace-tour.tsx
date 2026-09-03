'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  FileSpreadsheet,
  QrCode,
  PlusCircle,
  DownloadCloud,
  History,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-meta-form',
    title: '1. Course & Student Details',
    description:
      'Fill in your Subject Title, Name, Register Number, and Date. This formats the official college header and declaration.',
    icon: <FileSpreadsheet className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />,
  },
  {
    targetId: 'tour-exp-card-0',
    title: '2. Experiments & Live QR Code',
    description:
      'Enter the experiment title, date, and GitHub repo link. A scannable verification QR code generates instantly in your browser.',
    icon: <QrCode className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />,
  },
  {
    targetId: 'tour-add-btn',
    title: '3. Add More Experiments',
    description:
      "Click '+ Add Experiment' to append new rows. Experiment numbers are automatically assigned sequentially.",
    icon: <PlusCircle className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />,
  },
  {
    targetId: 'tour-action-bar',
    title: '4. Preview & Export Document',
    description:
      'Preview the exact college table format, then download ready-to-print PDFs or editable Word DOCX files with one click.',
    icon: <DownloadCloud className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />,
  },
  {
    targetId: 'tour-history-btn',
    title: '5. View Past Records',
    description:
      'Access all previously generated lab records anytime from the History tab in your navigation header.',
    icon: <History className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />,
  },
];

export default function WorkspaceTour() {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Check tour completion status on mount / auth change
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;

    const checkTourStatus = async () => {
      // 1. Check if user explicitly triggered the tour
      if (typeof window !== 'undefined' && sessionStorage.getItem('labora_force_tour') === 'true') {
        sessionStorage.removeItem('labora_force_tour');
        if (isMounted) {
          setIsOpen(true);
          setCurrentStep(0);
        }
        return;
      }

      // 2. Query Firestore if user is authenticated
      if (user?.uid && db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data()?.hasSeenTour === true) {
            localStorage.setItem('labora_tour_completed', 'true');
            if (isMounted) setIsOpen(false);
            return;
          }
        } catch (error) {
          console.warn('Could not read tour status from Firestore:', error);
        }
      }

      // 3. Fallback: check localStorage
      const completed = typeof window !== 'undefined' ? localStorage.getItem('labora_tour_completed') : null;
      if (!completed && isMounted) {
        const timer = setTimeout(() => {
          if (isMounted) {
            setIsOpen(true);
            setCurrentStep(0);
          }
        }, 400);
        return () => clearTimeout(timer);
      }
    };

    checkTourStatus();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  // Listen for custom trigger event (e.g. from Header Tour button)
  useEffect(() => {
    const handleStartTour = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('labora_force_tour');
      }
      setIsOpen(true);
      setCurrentStep(0);
    };

    window.addEventListener('labora_start_tour', handleStartTour);
    return () => {
      window.removeEventListener('labora_start_tour', handleStartTour);
    };
  }, []);

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    const target = document.getElementById(step.targetId);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    const target = document.getElementById(step.targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timeout = setTimeout(updateTargetRect, 250);

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, { passive: true });

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [currentStep, isOpen, updateTargetRect]);

  const handleFinishTour = () => {
    // 1. Immediately close tour and update local cache
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('labora_force_tour');
      localStorage.setItem('labora_tour_completed', 'true');
    }

    // 2. Persist completion to Firestore asynchronously if user is signed in
    if (user?.uid && db) {
      setDoc(
        doc(db, 'users', user.uid),
        {
          email: user.email,
          hasSeenTour: true,
          tourCompletedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => {
        console.warn('Failed to persist tour completion to Firestore:', err);
      });
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      const nextStepObj = TOUR_STEPS[nextStep];
      if (nextStepObj) {
        const nextTarget = document.getElementById(nextStepObj.targetId);
        nextTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      handleFinishTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      const prevStepObj = TOUR_STEPS[prevStep];
      if (prevStepObj) {
        const prevTarget = document.getElementById(prevStepObj.targetId);
        prevTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const currentTour = TOUR_STEPS[currentStep];
  if (!isOpen || !currentTour) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-4 sm:p-6 pointer-events-none">
        {/* Crisp Spotlight Cutout Overlay */}
        <svg className="fixed inset-0 w-full h-full pointer-events-auto z-40">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 6}
                  y={targetRect.top - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="16"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask="url(#tour-spotlight-mask)"
            onClick={handleFinishTour}
          />
        </svg>

        {/* Clean Neutral Focus Ring */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 32 }}
            className="fixed pointer-events-none z-45 rounded-2xl ring-2 ring-zinc-900/90 dark:ring-zinc-100/90 shadow-[0_0_30px_rgba(0,0,0,0.2)] dark:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          />
        )}

        {/* Floating Modal Card Container (bottom-sheet on mobile, bottom-right floating card on PC) */}
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:items-end sm:justify-end p-4 sm:p-8 pointer-events-none">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-50 w-full max-w-md pointer-events-auto rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-200/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                <span>
                  Step {currentStep + 1}
                </span>
              </div>

              <button
                onClick={handleFinishTour}
                type="button"
                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
                title="Close tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex items-start gap-3.5 mb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                {currentTour.icon}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {currentTour.title}
                </h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {currentTour.description}
                </p>
              </div>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3.5">
              {/* Step Dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      idx === currentStep ? 'w-5 bg-zinc-900 dark:bg-zinc-100' : 'w-1.5 bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFinishTour}
                  type="button"
                  className="px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition"
                >
                  Skip
                </button>

                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      <span>Finish</span>
                      <Check className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}