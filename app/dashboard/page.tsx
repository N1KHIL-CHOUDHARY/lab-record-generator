'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/header';
import DocumentPreviewModal from '@/components/document-preview-modal';
import WorkspaceTour from '@/components/workspace-tour';
import { generatePDF, generateDOCX, mergeWithBonafide } from '@/lib/document-generator';
import { saveLabRecord, parseCourseInfo } from '@/lib/record-service';
import {
  Plus,
  Trash2,
  Eye,
  Download,
  FileText,
  Bookmark,
  Check,
  Loader2,
  AlertCircle,
  History,
  X,
} from 'lucide-react';

export interface Experiment {
  id: string;
  title: string;
  date: string;
  githubLink: string;
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

  const [activeRecordId, setActiveRecordId] = useState<string>(() => `rec-${Date.now()}`);
  const [courseTitle, setCourseTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');

  const [experiments, setExperiments] = useState<Experiment[]>([
    {
      id: 'exp-1',
      title: '',
      date: '',
      githubLink: '',
    },
  ]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showBonafideModal, setShowBonafideModal] = useState(false);
  const [rememberBonafideChoice, setRememberBonafideChoice] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isDocxGenerating, setIsDocxGenerating] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [toast, setToast] = useState<{ message: string; hasPostActions?: boolean } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hydration Guard State
  const [isHydrated, setIsHydrated] = useState(false);

  const isFormValid = Boolean(
    courseTitle.trim() &&
    studentName.trim() &&
    registerNumber.trim() &&
    experiments.length > 0 &&
    experiments.every((exp) => exp.title.trim() && exp.githubLink.trim())
  );

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Single Mount Restoration Hook with Hydration Guard
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const isExplicitNew = searchParams.get('new') === 'true';

      if (isExplicitNew) {
        const freshId = `rec-${Date.now()}`;
        setActiveRecordId(freshId);
        setCourseTitle('');
        setRegisterNumber('');
        if (user?.displayName) {
          setStudentName(user.displayName);
        } else {
          setStudentName('');
        }
        setExperiments([
          {
            id: 'exp-1',
            title: '',
            date: '',
            githubLink: '',
          },
        ]);
        localStorage.removeItem('labora_active_workspace');
        window.history.replaceState({}, '', '/dashboard');
      } else {
        const savedDraft = localStorage.getItem('labora_active_workspace');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.id) {
            setActiveRecordId(String(parsed.id));
          }
          if (parsed.courseTitle) setCourseTitle(parsed.courseTitle);
          // Prioritize saved draft studentName; fallback to user?.displayName only if draft studentName is empty
          if (parsed.studentName) {
            setStudentName(parsed.studentName);
          } else if (user?.displayName) {
            setStudentName(user.displayName);
          }
          if (parsed.registerNumber) setRegisterNumber(parsed.registerNumber);
          if (Array.isArray(parsed.experiments) && parsed.experiments.length > 0) {
            setExperiments(parsed.experiments);
          }
        } else if (user?.displayName) {
          setStudentName(user.displayName);
        }
      }
    } catch (e) {
      console.error('Failed to restore workspace draft:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to active workspace cache (only after hydration)
  useEffect(() => {
    if (!isHydrated) return;

    try {
      localStorage.setItem(
        'labora_active_workspace',
        JSON.stringify({
          id: activeRecordId,
          courseTitle,
          studentName,
          registerNumber,
          experiments,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error('Failed to cache active workspace:', e);
    }
  }, [isHydrated, activeRecordId, courseTitle, studentName, registerNumber, experiments]);

  const showToast = (message: string, hasPostActions = false) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, hasPostActions });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Top-Level and Post-Export New Record Initializer
  const handleStartNewRecord = () => {
    // If the current record is valid, ensure it is safely written to history before clearing
    if (isFormValid) {
      saveInputDataToHistory(true);
    }

    const newId = `rec-${Date.now()}`;
    const cleanExperiments: Experiment[] = [
      {
        id: 'exp-1',
        title: '',
        date: '',
        githubLink: '',
      },
    ];

    setActiveRecordId(newId);
    setCourseTitle('');
    setRegisterNumber('');
    setExperiments(cleanExperiments);

    // Retain studentName from user profile or active session
    const preservedName = studentName.trim() || user?.displayName || '';
    if (!studentName && preservedName) {
      setStudentName(preservedName);
    }

    try {
      localStorage.setItem(
        'labora_active_workspace',
        JSON.stringify({
          id: newId,
          courseTitle: '',
          studentName: preservedName,
          registerNumber: '',
          experiments: cleanExperiments,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error('Failed to update workspace for new record:', e);
    }

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
      title: '',
      date: '',
      githubLink: '',
    };
    setExperiments((prev) => [...prev, newExp]);
  };

  const handleDeleteExperiment = (id: string) => {
    if (experiments.length <= 1) return;
    setExperiments((prev) => prev.filter((exp) => exp.id !== id));
  };

  const handleUpdateExperiment = (
    id: string,
    field: 'title' | 'date' | 'githubLink',
    value: string
  ) => {
    setExperiments((prev) =>
      prev.map((exp) => {
        if (exp.id === id) {
          return { ...exp, [field]: value };
        }
        return exp;
      })
    );
  };

  // Pure Input Data History Saver (Updates local history & persists pure text metadata to Firestore)
  const saveInputDataToHistory = async (silent = false): Promise<boolean> => {
    if (!isFormValid) {
      if (!silent) showToast('Fill all required fields before saving.');
      return false;
    }

    try {
      let currentId = String(activeRecordId);
      const recordPayload: SavedRecord = {
        id: currentId,
        recordName: courseTitle.trim() || 'Untitled Record',
        courseTitle: courseTitle.trim(),
        studentName: studentName.trim(),
        registerNumber: registerNumber.trim(),
        experiments: experiments.map((e) => ({
          id: e.id,
          title: e.title.trim(),
          date: e.date.trim(),
          githubLink: e.githubLink.trim(),
        })),
        updatedAt: new Date().toISOString(),
      };

      const existingHistory: SavedRecord[] = JSON.parse(
        localStorage.getItem('labora_records_history') || '[]'
      );

      // Upsert: Find by exact ID or fallback to matching courseTitle + registerNumber
      const normalizedCourse = courseTitle.trim().toLowerCase();
      const normalizedReg = registerNumber.trim().toLowerCase();

      const existingIndex = existingHistory.findIndex((r) => {
        if (String(r.id) === currentId) return true;
        if (
          normalizedCourse &&
          normalizedReg &&
          r.courseTitle?.trim().toLowerCase() === normalizedCourse &&
          r.registerNumber?.trim().toLowerCase() === normalizedReg
        ) {
          return true;
        }
        return false;
      });

      let updatedList: SavedRecord[];
      if (existingIndex >= 0) {
        // Keep the canonical ID so subsequent edits match consistently
        const targetId = String(existingHistory[existingIndex].id || currentId);
        recordPayload.id = targetId;
        currentId = targetId;
        if (String(activeRecordId) !== targetId) {
          setActiveRecordId(targetId);
        }

        updatedList = [...existingHistory];
        updatedList[existingIndex] = recordPayload;
      } else {
        // Prepend brand new entry, limit history to 50
        updatedList = [recordPayload, ...existingHistory.slice(0, 49)];
      }

      localStorage.setItem('labora_records_history', JSON.stringify(updatedList));

      // Asynchronously persist pure text metadata to Firestore under users/{userId}/records
      if (user?.uid) {
        if (!silent) setIsSavingToCloud(true);
        try {
          const { courseCode, courseTitle: parsedTitle } = parseCourseInfo(courseTitle);
          const cloudDocId = await saveLabRecord(
            user.uid,
            {
              userEmail: user.email,
              studentName: studentName.trim(),
              registerNumber: registerNumber.trim(),
              courseCode,
              courseTitle: parsedTitle || courseTitle.trim(),
              recordDate: experiments[0]?.date || new Date().toISOString().split('T')[0],
              experiments: experiments.map((exp, idx) => ({
                experimentNo: idx + 1,
                title: exp.title.trim(),
                date: exp.date.trim(),
                githubUrl: exp.githubLink.trim(),
              })),
            },
            currentId.startsWith('rec-') ? undefined : currentId
          );

          if (cloudDocId && cloudDocId !== currentId) {
            setActiveRecordId(cloudDocId);
            const syncedList = updatedList.map((r) =>
              r.id === currentId ? { ...r, id: cloudDocId } : r
            );
            localStorage.setItem('labora_records_history', JSON.stringify(syncedList));
          }

          if (!silent) showToast('Record details saved to cloud & history!', true);
        } catch (cloudErr) {
          console.warn('Firestore cloud sync notice:', cloudErr);
          if (!silent) showToast('Record saved to History!', true);
        } finally {
          if (!silent) setIsSavingToCloud(false);
        }
      } else {
        if (!silent) showToast('Record saved to History!', true);
      }

      return true;
    } catch (e) {
      console.error('Failed to save record to history:', e);
      if (!silent) showToast('Failed to save record.');
      return false;
    }
  };

  // 1. Preview Handler (Saves pure inputs then opens modal)
  const handlePreviewClick = () => {
    if (!isFormValid) return;
    saveInputDataToHistory(true);
    setIsPreviewOpen(true);
  };

  // 2. PDF Download Handler (Saves pure inputs then generates PDF)
  const executePdfDownload = async (withBonafide: boolean) => {
    setIsPdfGenerating(true);
    saveInputDataToHistory(true);

    try {
      const documentData = {
        courseTitle,
        studentName,
        registerNumber,
        experiments,
      };

      if (withBonafide) {
        const basePdfBlob = (await generatePDF(documentData, true)) as Blob;
        if (basePdfBlob) {
          const mergedBlob = await mergeWithBonafide(basePdfBlob);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(mergedBlob);
          link.download = `${courseTitle || 'document'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      } else {
        await generatePDF(documentData, false);
      }

      showToast('PDF downloaded & record saved to History!', true);
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

  // 3. DOCX Download Handler (Saves pure inputs then generates DOCX)
  const handleDownloadDocx = async () => {
    if (!isFormValid) {
      showToast('Please fill all required fields before generating DOCX.');
      return;
    }
    setIsDocxGenerating(true);
    saveInputDataToHistory(true);

    try {
      await generateDOCX({
        courseTitle,
        studentName,
        registerNumber,
        experiments,
      });
      showToast('DOCX downloaded & record saved to History!', true);
    } catch (e) {
      console.error('DOCX generation failed:', e);
      showToast('Failed to generate DOCX.');
    } finally {
      setIsDocxGenerating(false);
    }
  };

  if (loading || !user || !isHydrated) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Verifying workspace session...
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
      <Header check={true}/>
      <WorkspaceTour />

      {/* Interactive Post-Export Toast Notification (Theme Aware) */}
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
          <h1 className="text-2xl font-bold tracking-tight">Document Details</h1>
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
            const expNumberFormatted = String(index + 1).padStart(2, '0');
            const isOnlyOne = experiments.length === 1;

            return (
              <div
                key={exp.id}
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
                    onClick={() => handleDeleteExperiment(exp.id)}
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
                      onChange={(e) => handleUpdateExperiment(exp.id, 'title', e.target.value)}
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
                        onChange={(e) => handleUpdateExperiment(exp.id, 'date', e.target.value)}
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
                        value={exp.githubLink}
                        onChange={(e) =>
                          handleUpdateExperiment(exp.id, 'githubLink', e.target.value)
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Direct Save to History Button */}
              <button
                onClick={() => saveInputDataToHistory(false)}
                disabled={!isFormValid || isSavingToCloud}
                type="button"
                title={!isFormValid ? 'Fill required fields to save' : 'Save inputs to history & cloud'}
                className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {isSavingToCloud ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                ) : (
                  <Bookmark className="h-4 w-4 text-zinc-400" />
                )}
                <span>{isSavingToCloud ? 'Saving...' : 'Save Record'}</span>
              </button>

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
        courseTitle={courseTitle}
        studentName={studentName}
        registerNumber={registerNumber}
        experiments={experiments}
      />
    </div>
  );
}