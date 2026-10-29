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
      'Fill in your Course Title, Student Name, and Register Number. This generates the official college header and declaration.',
    icon: <FileSpreadsheet className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
  },
  {
    targetId: 'tour-exp-card-0',
    title: '2. Experiments & Live QR Code',
    description:
      'Enter the experiment title, date, and GitHub repository link. High-resolution verification QR codes generate in real-time.',
    icon: <QrCode className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
  },
  {
    targetId: 'tour-add-btn',
    title: '3. Add More Experiments',
    description:
      "Click '+ Add Experiment' to append new rows. Experiment numbers and formatting are calculated sequentially.",
    icon: <PlusCircle className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
  },
  {
    targetId: 'tour-action-bar',
    title: '4. Preview & Export Document',
    description:
      'Preview the exact table formatting, then export ready-to-print PDFs or editable Word DOCX files with one click.',
    icon: <DownloadCloud className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
  },
  {
    targetId: 'tour-history-btn',
    title: '5. View Past Records',
    description:
      'Access, re-download, or edit any previously generated lab records anytime from the History tab.',
    icon: <History className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
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
      const completed =
        typeof window !== 'undefined' ? localStorage.getItem('labora_tour_completed') : null;
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
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('labora_force_tour');
      localStorage.setItem('labora_tour_completed', 'true');
    }

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
                  rx="18"
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
            fill="rgba(9, 9, 11, 0.55)"
            mask="url(#tour-spotlight-mask)"
            onClick={handleFinishTour}
          />
        </svg>

        {/* Focus Ring */}
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
            className="fixed pointer-events-none z-45 rounded-[18px] ring-2 ring-violet-500/80 dark:ring-violet-400/80 shadow-[0_0_30px_rgba(124,58,237,0.25)]"
          />
        )}

        {/* Floating Modal Card Container */}
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:items-end sm:justify-end p-4 sm:p-8 pointer-events-none">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-50 w-full max-w-md pointer-events-auto rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 p-5 sm:p-6 text-neutral-950 dark:text-neutral-50 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-md"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 dark:bg-violet-400/10 border border-violet-500/20 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                <Sparkles className="h-3 w-3" />
                <span>
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
              </div>

              <button
                onClick={handleFinishTour}
                type="button"
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
                title="Close tour"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step Body */}
            <div className="flex items-start gap-3.5 mb-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/70">
                {currentTour.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-950 dark:text-neutral-50 tracking-tight">
                  {currentTour.title}
                </h3>
                <p className="mt-1 text-xs sm:text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {currentTour.description}
                </p>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-3.5">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      idx === currentStep
                        ? 'w-5 bg-neutral-950 dark:bg-neutral-50'
                        : 'w-1.5 bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFinishTour}
                  type="button"
                  className="px-2.5 py-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition cursor-pointer"
                >
                  Skip
                </button>

                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-neutral-200/90 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-100 dark:hover:bg-neutral-750 active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 dark:bg-neutral-50 px-4 py-1.5 text-xs font-semibold text-white dark:text-neutral-950 shadow-xs transition hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-95 cursor-pointer"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      <span>Done</span>
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
