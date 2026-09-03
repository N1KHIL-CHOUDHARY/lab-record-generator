'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
    const hasContent =
      courseTitle.trim() ||
      experiments.some((e) => e.title.trim());
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
          // Create new record document and lock ID to prevent duplicate document spam
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
          isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {isRecordLoading ? 'Loading record from cloud...' : 'Verifying workspace session...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-150 pb-32 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      <Header check={true} />
      <WorkspaceTour />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-4 sm:right-6 z-50 flex flex-col gap-2.5 rounded-2xl border p-3.5 sm:p-4 text-xs font-semibold shadow-2xl backdrop-blur-md transition-all duration-200 max-w-[92vw] sm:max-w-md ${
            isDark
              ? 'border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-black/50'
              : 'border-zinc-200 bg-white/95 text-zinc-900 shadow-zinc-900/15'
          }`}
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
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-lg transition"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {toast.hasPostActions && (
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80">
              <button
                onClick={() => {
                  setToast(null);
                  handleStartNewRecord();
                }}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition active:scale-95"
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
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  isDark
                    ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200'
                    : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 shadow-xs'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>View History</span>
              </button>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Document Details</h1>

            {/* Subtle text-only status indicator (no colored badge/pill) */}
            {syncStatus === 'saving' && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 animate-pulse">
                saving...
              </span>
            )}
            {syncStatus === 'saved' && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                saved
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="text-xs text-rose-500">
                failed to save
              </span>
            )}
          </div>

          <button
            onClick={() => handleStartNewRecord()}
            type="button"
            title="Start a new blank lab record"
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3.5 py-2 text-xs font-semibold shadow-sm transition hover:bg-zinc-800 dark:hover:bg-white active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Record</span>
          </button>
        </div>

        {/* Section 1: Document Details Card */}
        <div
          id="tour-meta-form"
          className={`rounded-2xl p-6 border shadow-sm transition-all mb-8 ${
            isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-white border-zinc-200'
          }`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Course Title and Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="e.g., 19AI410 - Machine Learning Laboratory"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Student Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Student Name"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Register Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={registerNumber}
                  onChange={handleRegisterNumberChange}
                  placeholder="Register Number"
                  maxLength={12}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Experiment List Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold tracking-tight">List of Experiments</h2>
            <span className="text-xs text-zinc-400">
              {experiments.length} {experiments.length === 1 ? 'experiment' : 'experiments'}
            </span>
          </div>

          {experiments.map((exp, index) => {
            const expNumberFormatted = String(exp.experimentNo || index + 1).padStart(2, '0');
            const isOnlyOne = experiments.length === 1;

            return (
              <div
                key={exp.id || `exp-${index}`}
                id={index === 0 ? 'tour-exp-card-0' : undefined}
                className={`rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md ${
                  isDark
                    ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div
                  className={`flex items-center justify-between pb-3.5 mb-4 border-b ${
                    isDark ? 'border-zinc-800/80' : 'border-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold text-black dark:text-white bg-zinc-100 dark:bg-zinc-800">
                      Exp #{expNumberFormatted}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteExperiment(index)}
                    disabled={isOnlyOne}
                    type="button"
                    title={isOnlyOne ? 'At least one experiment is required' : 'Delete experiment'}
                    className={`flex items-center gap-1.5 rounded-full p-1.5 text-xs font-medium transition ${
                      isOnlyOne
                        ? 'cursor-not-allowed text-zinc-300 dark:text-zinc-700'
                        : 'text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Experiment Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={exp.title}
                      onChange={(e) => handleUpdateExperiment(index, 'title', e.target.value)}
                      placeholder="Enter Experiment Title"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                        isDark
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={exp.date || ''}
                        onChange={(e) => handleUpdateExperiment(index, 'date', e.target.value)}
                        className={`w-full px-3.5 py-2 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        GitHub Link <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={exp.githubUrl}
                        onChange={(e) =>
                          handleUpdateExperiment(index, 'githubUrl', e.target.value)
                        }
                        placeholder="https://github.com/..."
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          isDark
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 3: Add & Actions */}
        <div className="flex flex-col mt-5 space-y-6">
          <button
            id="tour-add-btn"
            onClick={() => handleAddExperiment()}
            type="button"
            className={`w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-semibold transition-all active:scale-[0.99] ${
              isDark
                ? 'border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-400'
                : 'border-zinc-300 bg-white text-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-600 shadow-sm'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add Experiment #{String(experiments.length + 1).padStart(2, '0')}</span>
          </button>

          {/* Action Toolbar */}
          <div
            id="tour-action-bar"
            className={`w-full rounded-2xl border p-2.5 transition-colors ${
              isDark ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-200 bg-white shadow-sm'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Preview Button */}
              <button
                onClick={() => handlePreviewClick()}
                disabled={!isFormValid}
                type="button"
                title={!isFormValid ? 'Fill required fields to preview' : 'Preview Document'}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
                  isDark
                    ? 'border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
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
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {isDocxGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>DOCX</span>
              </button>

              {/* PDF Button */}
              <button
                onClick={() => handlePdfDownloadClick()}
                disabled={!isFormValid || isPdfGenerating || isDocxGenerating}
                type="button"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {isPdfGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>PDF</span>
              </button>
            </div>

            {!isFormValid && (
              <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                Fill Course Title, Student Name, Register Number, and each experiment&apos;s Title &amp; GitHub Link to enable Preview and Export.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Bonafide Modal */}
      {showBonafideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
              isDark ? 'bg-[#121212] border-[#2D2D2D] text-white' : 'bg-white border-[#D0D0D0] text-black'
            }`}
          >
            <h3 className="text-xl font-bold mb-2">Download PDF Options</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Would you like to merge the Bonafide Certificate with your generated Lab Record PDF?
            </p>

            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={() => handleBonafideChoice(true)}
                className="w-full py-3 px-4 rounded-xl font-semibold transition bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-lg"
              >
                Download with Bonafide
              </button>
              <button
                onClick={() => handleBonafideChoice(false)}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition border-2 ${
                  isDark
                    ? 'border-zinc-800 hover:bg-white/10 text-white'
                    : 'border-zinc-300 hover:bg-black/5 text-black'
                }`}
              >
                Download without Bonafide
              </button>
            </div>

            <div
              className="flex items-center gap-3 border-t pt-4"
              style={{ borderColor: isDark ? '#2D2D2D' : '#D0D0D0' }}
            >
              <input
                type="checkbox"
                id="rememberChoice"
                checked={rememberBonafideChoice}
                onChange={(e) => setRememberBonafideChoice(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="rememberChoice"
                className={`text-sm select-none cursor-pointer ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Remember my choice (asks again after 20 downloads)
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowBonafideModal(false)}
                className={`text-xs underline ${
                  isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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