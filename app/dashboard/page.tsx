'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/header';
import DocumentPreviewModal from '@/components/document-preview-modal';
import WorkspaceTour from '@/components/workspace-tour';
import { generatePDF, generateDOCX, mergeWithBonafide } from '@/lib/document-generator';
import { getLabRecord, parseCourseInfo } from '@/lib/record-service';
import { db } from '@/lib/firebase';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import {
  Plus,
  Trash2,
  Eye,
  Download,
  FileText,
  Check,
  Loader2,
  AlertCircle,
  History,
  X,
  FileSpreadsheet,
  Cloud,
  ExternalLink,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export interface Experiment {
  id?: string;
  experimentNo: number;
  title: string;
  date: string;
  githubUrl: string;
}

export interface SavedRecord {
  id: string;
  recordName: string;
  courseTitle: string;
  studentName: string;
  registerNumber: string;
  experiments: Experiment[];
  updatedAt: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  // Active Firestore Record Identifier
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

  // Form Fields State
  const [courseTitle, setCourseTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');

  const [experiments, setExperiments] = useState<Experiment[]>([
    {
      id: 'exp-1',
      experimentNo: 1,
      title: '',
      date: '',
      githubUrl: '',
    },
  ]);

  // Sync & Load States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Modal & Generation States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showBonafideModal, setShowBonafideModal] = useState(false);
  const [rememberBonafideChoice, setRememberBonafideChoice] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isDocxGenerating, setIsDocxGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; hasPostActions?: boolean } | null>(null);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPayloadRef = useRef<string>('');

  const isFormValid = Boolean(
    courseTitle.trim() &&
    studentName.trim() &&
    registerNumber.trim() &&
    experiments.length > 0 &&
    experiments.every((exp) => exp.title.trim() && exp.githubUrl.trim())
  );

  // Auth Guard & Firestore Record Loader
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const idParam = searchParams.get('id');
    const isExplicitNew = searchParams.get('new') === 'true';

    if (idParam && !isExplicitNew) {
      setIsRecordLoading(true);
      getLabRecord(user.uid, idParam)
        .then((docData) => {
          if (docData) {
            setCurrentRecordId(docData.id || idParam);

            const displayTitle =
              docData.courseCode &&
              docData.courseTitle &&
              !docData.courseTitle.includes(docData.courseCode)
                ? `${docData.courseCode} - ${docData.courseTitle}`
                : docData.courseTitle || docData.courseCode || '';

            setCourseTitle(displayTitle);
            setStudentName(docData.studentName || user.displayName || '');
            setRegisterNumber(docData.registerNumber || '');

            if (docData.experiments && docData.experiments.length > 0) {
              setExperiments(
                docData.experiments.map((exp, idx) => ({
                  id: `exp-${idx + 1}`,
                  experimentNo: exp.experimentNo || idx + 1,
                  title: exp.title || '',
                  date: exp.date || '',
                  githubUrl: exp.githubUrl || '',
                }))
              );
            }

            const initialPayload = JSON.stringify({
              courseTitle: displayTitle.trim(),
              studentName: (docData.studentName || user.displayName || '').trim(),
              registerNumber: (docData.registerNumber || '').trim(),
              experiments: (docData.experiments || []).map((exp, idx) => ({
                experimentNo: idx + 1,
                title: (exp.title || '').trim(),
                date: exp.date || '',
                githubUrl: (exp.githubUrl || '').trim(),
              })),
            });
            lastSavedPayloadRef.current = initialPayload;
            setSyncStatus('saved');
          } else {
            showToast('Record not found. Starting clean record.');
            setCurrentRecordId(null);
            if (user.displayName) setStudentName(user.displayName);
          }
        })
        .catch((err) => {
          console.error('Failed to load record from Firestore:', err);
          showToast('Failed to load record from cloud.');
        })
        .finally(() => {
          setIsInitialLoad(false);
          setIsRecordLoading(false);
          setIsHydrated(true);
        });
    } else {
      if (isExplicitNew) {
        window.history.replaceState({}, '', '/dashboard');
      }
      setCurrentRecordId(null);
      if (user.displayName) {
        setStudentName(user.displayName);
      }
      setIsInitialLoad(false);
      setIsHydrated(true);
    }
  }, [user, loading, router]);

  // Real-Time Debounced Firestore Auto-Save
  useEffect(() => {
    if (!user?.uid || isInitialLoad || isRecordLoading || !db) return;

    // Check if form contains minimum content to justify saving
    const hasContent = courseTitle.trim() || experiments.some((e) => e.title.trim());
    if (!hasContent) return;

    const payloadObj = {
      courseTitle: courseTitle.trim(),
      studentName: studentName.trim(),
      registerNumber: registerNumber.trim(),
      experiments: experiments.map((exp, idx) => ({
        experimentNo: idx + 1,
        title: exp.title.trim(),
        date: exp.date,
        githubUrl: exp.githubUrl.trim(),
      })),
    };

    const payloadString = JSON.stringify(payloadObj);
    if (payloadString === lastSavedPayloadRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!db) return;
      setSyncStatus('saving');
      try {
        const { courseCode, courseTitle: parsedTitle } = parseCourseInfo(courseTitle);
        const payload = {
          courseCode,
          courseTitle: parsedTitle || courseTitle.trim(),
          studentName: studentName.trim(),
          registerNumber: registerNumber.trim(),
          recordDate: experiments[0]?.date || new Date().toISOString().split('T')[0],
          experiments: experiments.map((exp, idx) => ({
            experimentNo: idx + 1,
            title: exp.title.trim(),
            date: exp.date,
            githubUrl: exp.githubUrl.trim(),
          })),
          updatedAt: new Date().toISOString(),
        };

        if (currentRecordId) {
          // Update active record in place
          await setDoc(doc(db, 'users', user.uid, 'records', currentRecordId), payload, {
            merge: true,
          });
          lastSavedPayloadRef.current = payloadString;
          setSyncStatus('saved');
        } else {
          // Create new record document and lock ID to prevent duplicate spam
          const docRef = await addDoc(collection(db, 'users', user.uid, 'records'), {
            ...payload,
            createdAt: new Date().toISOString(),
          });
          lastSavedPayloadRef.current = payloadString;
          setCurrentRecordId(docRef.id);
          window.history.replaceState({}, '', `/dashboard?id=${docRef.id}`);
          setSyncStatus('saved');
        }
      } catch (error) {
        console.error('Auto-save error:', error);
        setSyncStatus('error');
      }
    }, 1200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    courseTitle,
    studentName,
    registerNumber,
    experiments,
    user?.uid,
    currentRecordId,
    isInitialLoad,
    isRecordLoading,
  ]);

  const showToast = (message: string, hasPostActions = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, hasPostActions });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // "New Record" / Reset Action
  const handleStartNewRecord = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const cleanExperiments: Experiment[] = [
      {
        id: 'exp-1',
        experimentNo: 1,
        title: '',
        date: '',
        githubUrl: '',
      },
    ];

    setCurrentRecordId(null);
    setCourseTitle('');
    setRegisterNumber('');
    setExperiments(cleanExperiments);
    setSyncStatus('idle');
    lastSavedPayloadRef.current = '';

    if (user?.displayName) {
      setStudentName(user.displayName);
    } else {
      setStudentName('');
    }

    window.history.replaceState({}, '', '/dashboard');
    showToast('Clean record template ready.', false);
  };

  const handleRegisterNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (sanitized.length <= 12) {
      setRegisterNumber(sanitized);
    }
  };

  const handleAddExperiment = () => {
    const newExp: Experiment = {
      id: `exp-${Date.now()}`,
      experimentNo: experiments.length + 1,
      title: '',
      date: '',
      githubUrl: '',
    };
    setExperiments((prev) => [...prev, newExp]);
  };

  const handleDeleteExperiment = (index: number) => {
    if (experiments.length <= 1) return;
    setExperiments((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((exp, idx) => ({
        ...exp,
        experimentNo: idx + 1,
      }));
    });
  };

  const handleUpdateExperiment = (
    index: number,
    field: 'title' | 'date' | 'githubUrl',
    value: string
  ) => {
    setExperiments((prev) =>
      prev.map((exp, idx) => {
        if (idx === index) {
          return { ...exp, [field]: value };
        }
        return exp;
      })
    );
  };

  // Preview Handler
  const handlePreviewClick = () => {
    if (!isFormValid) return;
    setIsPreviewOpen(true);
  };

  // PDF Download Handler
  const executePdfDownload = async (withBonafide: boolean) => {
    setIsPdfGenerating(true);

    try {
      const documentData = {
        courseTitle: courseTitle.trim(),
        studentName: studentName.trim(),
        registerNumber: registerNumber.trim(),
        experiments: experiments.map((exp, idx) => ({
          id: exp.id || `exp-${idx + 1}`,
          title: exp.title.trim(),
          date: exp.date,
          githubLink: exp.githubUrl.trim(),
        })),
      };

      if (withBonafide) {
        const basePdfBlob = (await generatePDF(documentData, true)) as Blob;
        if (basePdfBlob) {
          const mergedBlob = await mergeWithBonafide(basePdfBlob);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(mergedBlob);
          link.download = `${courseTitle.trim() || 'document'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      } else {
        await generatePDF(documentData, false);
      }

      showToast('PDF downloaded successfully!', true);
    } catch (e) {
      console.error('PDF generation failed:', e);
      showToast('Failed to generate PDF.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handlePdfDownloadClick = async () => {
    if (!isFormValid) {
      showToast('Please fill all required fields before generating PDF.');
      return;
    }

    const savedChoice = localStorage.getItem('pdf_download_choice');
    const count = parseInt(localStorage.getItem('pdf_download_count') || '0', 10);

    if (savedChoice && count < 20) {
      localStorage.setItem('pdf_download_count', (count + 1).toString());
      await executePdfDownload(savedChoice === 'with');
    } else {
      setShowBonafideModal(true);
    }
  };

  const handleBonafideChoice = async (withBonafide: boolean) => {
    setShowBonafideModal(false);

    if (rememberBonafideChoice) {
      localStorage.setItem('pdf_download_choice', withBonafide ? 'with' : 'without');
      localStorage.setItem('pdf_download_count', '1');
    } else {
      localStorage.removeItem('pdf_download_choice');
      localStorage.removeItem('pdf_download_count');
    }

    await executePdfDownload(withBonafide);
  };

  // DOCX Download Handler
  const handleDownloadDocx = async () => {
    if (!isFormValid) {
      showToast('Please fill all required fields before generating DOCX.');
      return;
    }
    setIsDocxGenerating(true);

    try {
      await generateDOCX({
        courseTitle: courseTitle.trim(),
        studentName: studentName.trim(),
        registerNumber: registerNumber.trim(),
        experiments: experiments.map((exp, idx) => ({
          id: exp.id || `exp-${idx + 1}`,
          title: exp.title.trim(),
          date: exp.date,
          githubLink: exp.githubUrl.trim(),
        })),
      });
      showToast('DOCX downloaded successfully!', true);
    } catch (e) {
      console.error('DOCX generation failed:', e);
      showToast('Failed to generate DOCX.');
    } finally {
      setIsDocxGenerating(false);
    }
  };

  if (loading || !user || !isHydrated || isRecordLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? 'bg-[#09090b] text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tracking-wide">
            {isRecordLoading ? 'Loading record from cloud...' : 'Verifying workspace session...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 pb-36 ${
        isDark ? 'bg-[#09090b] text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      <Header check={true} />
      <WorkspaceTour />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            role="status"
            aria-live="polite"
            className="fixed top-18 right-4 sm:right-6 z-50 flex flex-col gap-2.5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 p-3.5 sm:p-4 text-xs font-semibold shadow-xl backdrop-blur-md max-w-[92vw] sm:max-w-md text-neutral-900 dark:text-neutral-100"
          >
            <div className="flex items-center gap-2.5">
              {toast.message.toLowerCase().includes('fail') ||
              toast.message.toLowerCase().includes('fill') ||
              toast.message.toLowerCase().includes('please') ? (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </div>
              )}
              <span className="leading-snug flex-1 font-medium">{toast.message}</span>
              <button
                onClick={() => setToast(null)}
                type="button"
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded-lg transition cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {toast.hasPostActions && (
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => {
                    setToast(null);
                    handleStartNewRecord();
                  }}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Record</span>
                </button>

                <button
                  onClick={() => {
                    setToast(null);
                    router.push('/history');
                  }}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-2xs transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 cursor-pointer"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>View History</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Workspace Title & Executive Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
                Autonomous Lab Record
              </h1>
              {/* Cloud Sync State Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 text-[11px] font-medium">
                {syncStatus === 'saving' && (
                  <>
                    <Cloud className="h-3 w-3 text-violet-500 animate-pulse" />
                    <span className="text-violet-600 dark:text-violet-400">Saving...</span>
                  </>
                )}
                {syncStatus === 'saved' && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-neutral-500 dark:text-neutral-400">Saved to cloud</span>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="text-rose-500">Sync issue</span>
                  </>
                )}
                {syncStatus === 'idle' && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                    <span className="text-neutral-500 dark:text-neutral-400">Cloud synced</span>
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Saveetha Engineering College Autonomous record template with automatic GitHub verification QR codes.
            </p>
          </div>

          <button
            onClick={() => handleStartNewRecord()}
            type="button"
            title="Start a new blank lab record"
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs transition hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Record</span>
          </button>
        </div>

        {/* Section 1: Course & Student Metadata Card */}
        <div
          id="tour-meta-form"
          className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 p-6 sm:p-7 shadow-[0_4px_25px_rgba(0,0,0,0.03)] backdrop-blur-xs mb-7"
        >
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
                Course &amp; Student Information
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Printed in the standard college header, declaration, and verification table.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                  Course Title and Code <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-neutral-400">e.g., 19AI410 - Machine Learning</span>
              </div>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g., 19AI410 - Machine Learning Laboratory"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 transition-all focus:border-[#7c3aed] dark:focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 transition-all focus:border-[#7c3aed] dark:focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                    Register Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-neutral-400">{registerNumber.length}/12</span>
                </div>
                <input
                  type="text"
                  value={registerNumber}
                  onChange={handleRegisterNumberChange}
                  placeholder="e.g., 211419104001"
                  maxLength={12}
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 tracking-wider transition-all focus:border-[#7c3aed] dark:focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Experiment Input Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-neutral-950 dark:text-white">
                Experiments
              </h2>
              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700">
                {experiments.length} {experiments.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">QR codes generated automatically</span>
          </div>

          <AnimatePresence initial={false}>
            {experiments.map((exp, index) => {
              const expNumberFormatted = String(exp.experimentNo || index + 1).padStart(2, '0');
              const isOnlyOne = experiments.length === 1;
              const hasValidLink = Boolean(exp.githubUrl.trim().startsWith('http'));

              return (
                <motion.div
                  key={exp.id || `exp-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  id={index === 0 ? 'tour-exp-card-0' : undefined}
                  className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/60 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] backdrop-blur-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold font-mono text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700">
                        Exp #{expNumberFormatted}
                      </span>
                      {exp.title.trim() && hasValidLink && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteExperiment(index)}
                      disabled={isOnlyOne}
                      type="button"
                      title={isOnlyOne ? 'At least one experiment is required' : 'Delete experiment'}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                        isOnlyOne
                          ? 'cursor-not-allowed opacity-30 text-neutral-400'
                          : 'text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer active:scale-95'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                        Experiment Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => handleUpdateExperiment(index, 'title', e.target.value)}
                        placeholder="e.g., Implementation of Decision Tree Classification Algorithm"
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 transition-all focus:border-[#7c3aed] dark:focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                          Date (Optional)
                        </label>
                        <input
                          type="date"
                          value={exp.date || ''}
                          onChange={(e) => handleUpdateExperiment(index, 'date', e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 transition-all focus:border-[#7c3aed] dark:focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                            GitHub Link <span className="text-rose-500">*</span>
                          </label>
                          {hasValidLink && (
                            <a
                              href={exp.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
                            >
                              <span>Test Link</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <input
                          type="url"
                          value={exp.githubUrl}
                          onChange={(e) =>
                            handleUpdateExperiment(index, 'githubUrl', e.target.value)
                          }
                          placeholder="https://github.com/username/repository"
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2.5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 transition-all focus:border-[#7c3aed] dark:focus:border-[#8b5cf6] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Section 3: Add Experiment Button & Executive Action Toolbar */}
        <div className="flex flex-col mt-5 space-y-6">
          <button
            id="tour-add-btn"
            onClick={() => handleAddExperiment()}
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 py-4 text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
          >
            <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span>Add Experiment #{String(experiments.length + 1).padStart(2, '0')}</span>
          </button>

          {/* Action Dock */}
          <div
            id="tour-action-bar"
            className="w-full rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 p-3.5 sm:p-5 shadow-[0_15px_40px_rgba(0,0,0,0.06)] backdrop-blur-md"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Preview Button */}
              <button
                onClick={() => handlePreviewClick()}
                disabled={!isFormValid}
                type="button"
                title={!isFormValid ? 'Fill required fields to preview' : 'Preview Document'}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                  isDark
                    ? 'border-neutral-700 bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>

              {/* DOCX Button */}
              <button
                onClick={() => handleDownloadDocx()}
                disabled={!isFormValid || isDocxGenerating || isPdfGenerating}
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 px-4 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-2xs transition-all hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isDocxGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : (
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                )}
                <span>Export DOCX</span>
              </button>

              {/* PDF Button */}
              <button
                onClick={() => handlePdfDownloadClick()}
                disabled={!isFormValid || isPdfGenerating || isDocxGenerating}
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 dark:bg-white px-4 text-xs sm:text-sm font-semibold text-white dark:text-neutral-950 shadow-md transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {isPdfGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white dark:text-neutral-950" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Download PDF</span>
              </button>
            </div>

            {!isFormValid && (
              <p className="mt-3 text-center text-[11px] text-neutral-400 dark:text-neutral-500 font-medium">
                Fill Course Title, Student Name, Register Number, and each experiment&apos;s Title &amp; GitHub Link to export.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bonafide Certificate Options Modal */}
      <AnimatePresence>
        {showBonafideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
              onClick={() => setShowBonafideModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md rounded-3xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-7 shadow-2xl text-neutral-950 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    <Download className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold tracking-tight">PDF Export Options</h3>
                </div>
                <button
                  onClick={() => setShowBonafideModal(false)}
                  type="button"
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs sm:text-[13px] text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
                Choose whether to merge the official college Bonafide Certificate page at the beginning of your Lab Record PDF.
              </p>

              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={() => handleBonafideChoice(true)}
                  type="button"
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
                >
                  <span>Download with Bonafide</span>
                </button>

                <button
                  onClick={() => handleBonafideChoice(false)}
                  type="button"
                  className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>Download without Bonafide</span>
                </button>
              </div>

              <div className="flex items-center gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <input
                  type="checkbox"
                  id="rememberChoice"
                  checked={rememberBonafideChoice}
                  onChange={(e) => setRememberBonafideChoice(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label
                  htmlFor="rememberChoice"
                  className="text-xs select-none cursor-pointer text-neutral-600 dark:text-neutral-400"
                >
                  Remember my choice (prompts again after 20 downloads)
                </label>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isDark={isDark}
        courseTitle={courseTitle.trim()}
        studentName={studentName}
        registerNumber={registerNumber}
        experiments={experiments.map((exp, idx) => ({
          id: exp.id || `exp-${idx + 1}`,
          title: exp.title,
          date: exp.date,
          githubLink: exp.githubUrl,
        }))}
      />
    </div>
  );
}
