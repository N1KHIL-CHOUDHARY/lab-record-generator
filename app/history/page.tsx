'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/header';
import DocumentPreviewModal from '@/components/document-preview-modal';
import { generatePDF, generateDOCX, mergeWithBonafide } from '@/lib/document-generator';
import { getUserLabRecords, deleteLabRecord } from '@/lib/record-service';
import { SavedRecord } from '@/types/record';
import {
  History,
  FileText,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Check,
  Loader2,
  Eye,
  BookOpen,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloadingPdfId, setIsDownloadingPdfId] = useState<string | null>(null);
  const [isDownloadingDocxId, setIsDownloadingDocxId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Document Preview Modal State
  const [previewRecord, setPreviewRecord] = useState<SavedRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Bonafide Modal States
  const [showBonafideModal, setShowBonafideModal] = useState(false);
  const [pendingPdfRecord, setPendingPdfRecord] = useState<SavedRecord | null>(null);
  const [rememberBonafideChoice, setRememberBonafideChoice] = useState(false);

  // Clear Confirmation Modal State
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load history records from localStorage and sync from Firestore
  useEffect(() => {
    let localNormalized: SavedRecord[] = [];

    try {
      const stored = localStorage.getItem('labora_records_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localNormalized = parsed.map((item: any, idx: number) => {
            const timestamp = item.updatedAt || item.createdAt || new Date().toISOString();
            const fallbackName =
              item.courseTitle ||
              `Untitled Record - ${new Date(timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}`;
            return {
              id: item.id || `rec-${Date.now()}-${idx}`,
              recordName: item.recordName || fallbackName,
              courseTitle: item.courseTitle || '',
              studentName: item.studentName || '',
              registerNumber: item.registerNumber || '',
              experiments: Array.isArray(item.experiments)
                ? item.experiments.map((exp: any, i: number) => ({
                    id: exp.id || `exp-${i + 1}`,
                    title: exp.title || '',
                    date: exp.date || '',
                    githubLink: exp.githubLink || '',
                  }))
                : [],
              updatedAt: timestamp,
            };
          });
          setRecords(localNormalized);
        }
      }
    } catch (e) {
      console.error('Failed to load local history:', e);
    }

    // If authenticated, sync with Firestore records
    if (user?.uid) {
      getUserLabRecords(user.uid)
        .then((cloudDocs) => {
          if (!cloudDocs || cloudDocs.length === 0) return;

          const cloudRecords: SavedRecord[] = cloudDocs.map((doc) => {
            const fullTitle = doc.courseCode
              ? `${doc.courseCode} - ${doc.courseTitle}`
              : doc.courseTitle || 'Untitled Record';
            return {
              id: doc.id || `cloud-${Date.now()}`,
              recordName: fullTitle,
              courseTitle: fullTitle,
              studentName: doc.studentName || '',
              registerNumber: doc.registerNumber || '',
              experiments: (doc.experiments || []).map((exp, idx) => ({
                id: `exp-${exp.experimentNo || idx + 1}`,
                title: exp.title || '',
                date: exp.date || '',
                githubLink: exp.githubUrl || '',
              })),
              updatedAt: doc.updatedAt || doc.createdAt || new Date().toISOString(),
            };
          });

          // Merge cloud records with local records
          const mergedMap = new Map<string, SavedRecord>();

          // Cloud records take authority
          cloudRecords.forEach((r) => {
            mergedMap.set(String(r.id), r);
          });

          // Retain local records if not yet on cloud
          localNormalized.forEach((local) => {
            const alreadyExists = cloudRecords.some(
              (c) =>
                c.id === local.id ||
                (c.courseTitle.trim().toLowerCase() === local.courseTitle.trim().toLowerCase() &&
                  c.registerNumber.trim().toLowerCase() === local.registerNumber.trim().toLowerCase())
            );
            if (!alreadyExists) {
              mergedMap.set(String(local.id), local);
            }
          });

          const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = new Date(a.updatedAt || 0).getTime();
            const timeB = new Date(b.updatedAt || 0).getTime();
            return timeB - timeA;
          });

          setRecords(mergedList);
          try {
            localStorage.setItem('labora_records_history', JSON.stringify(mergedList));
          } catch (storageErr) {
            console.warn('Failed to cache merged history:', storageErr);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch cloud records from Firestore:', err);
        });
    }
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    try {
      localStorage.setItem('labora_records_history', JSON.stringify(updated));
      showToast('Record removed from history.');
    } catch (e) {
      console.error('Failed to update history storage:', e);
    }

    if (user?.uid && !id.startsWith('rec-local-')) {
      deleteLabRecord(user.uid, id).catch((err) => {
        console.warn('Could not delete record from Firestore:', err);
      });
    }
  };

  const handleConfirmClearHistory = () => {
    setRecords([]);
    setShowClearConfirm(false);
    try {
      localStorage.removeItem('labora_records_history');
      showToast('All history records cleared.');
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  };

  const handleCreateNewRecord = () => {
    router.push('/dashboard?new=true');
  };

  const handleOpenInEditor = (record: SavedRecord) => {
    router.push(`/dashboard?id=${encodeURIComponent(record.id)}`);
  };

  // Preview Action
  const handlePreviewRecord = (record: SavedRecord) => {
    setPreviewRecord(record);
    setIsPreviewOpen(true);
  };

  // On-Demand DOCX Download
  const handleDownloadDocx = async (record: SavedRecord) => {
    setIsDownloadingDocxId(record.id);
    try {
      await generateDOCX({
        courseTitle: record.courseTitle,
        studentName: record.studentName,
        registerNumber: record.registerNumber,
        experiments: record.experiments,
      });
      showToast('DOCX document downloaded successfully!');
    } catch (e) {
      console.error('Failed to export DOCX:', e);
      showToast('Failed to download DOCX file.');
    } finally {
      setIsDownloadingDocxId(null);
    }
  };

  // Core PDF Download Execution
  const executePdfDownload = async (record: SavedRecord, withBonafide: boolean) => {
    setIsDownloadingPdfId(record.id);
    try {
      const documentPayload = {
        courseTitle: record.courseTitle,
        studentName: record.studentName,
        registerNumber: record.registerNumber,
        experiments: record.experiments,
      };

      if (withBonafide) {
        const basePdfBlob = (await generatePDF(documentPayload, true)) as Blob;
        if (basePdfBlob) {
          const mergedBlob = await mergeWithBonafide(basePdfBlob);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(mergedBlob);
          link.download = `${record.courseTitle || 'document'}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      } else {
        await generatePDF(documentPayload, false);
      }

      showToast('PDF downloaded successfully!');
    } catch (e) {
      console.error('Failed to download PDF:', e);
      showToast('Failed to download PDF file.');
    } finally {
      setIsDownloadingPdfId(null);
      setPendingPdfRecord(null);
    }
  };

  // On-Demand PDF Download Interceptor
  const handleDownloadPdf = async (record: SavedRecord) => {
    const savedChoice = localStorage.getItem('pdf_download_choice');
    const count = parseInt(localStorage.getItem('pdf_download_count') || '0', 10);

    if (savedChoice && count < 20) {
      localStorage.setItem('pdf_download_count', (count + 1).toString());
      await executePdfDownload(record, savedChoice === 'with');
    } else {
      setPendingPdfRecord(record);
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

    if (pendingPdfRecord) {
      await executePdfDownload(pendingPdfRecord, withBonafide);
    }
  };

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.courseTitle.toLowerCase().includes(query) ||
        r.studentName.toLowerCase().includes(query) ||
        r.registerNumber.toLowerCase().includes(query) ||
        r.experiments.some((e) => e.title.toLowerCase().includes(query))
    );
  }, [records, searchQuery]);

  if (loading || !user) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? 'bg-[#09090b] text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600 dark:text-violet-400" />
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 tracking-wide">
            Loading your record history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 pb-32 ${
        isDark ? 'bg-[#09090b] text-neutral-100' : 'bg-[#fafafa] text-neutral-900'
      }`}
    >
      <Header check={false} />

      {/* Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            role="status"
            aria-live="polite"
            className={`fixed top-18 right-4 sm:right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl backdrop-blur-md ${
              isDark
                ? 'border-neutral-800 bg-[#121215]/95 text-neutral-100'
                : 'border-neutral-200 bg-white/95 text-neutral-900'
            }`}
          >
            {toastMessage.toLowerCase().includes('fail') ||
            toastMessage.toLowerCase().includes('fill') ||
            toastMessage.toLowerCase().includes('please') ? (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="leading-snug">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Header Title & Controls Section */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className={`text-xl sm:text-2xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              Record History
            </h1>
            <p
              className={`text-xs sm:text-[13px] mt-1 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              View, export on-demand, or open any previously saved Saveetha Autonomous lab record.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {records.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                type="button"
                className={`text-xs px-3 py-2 rounded-xl font-semibold transition active:scale-95 cursor-pointer ${
                  isDark
                    ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10'
                    : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                Clear History
              </button>
            )}

            <button
              onClick={() => handleCreateNewRecord()}
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                  : 'bg-neutral-950 text-white hover:bg-neutral-800'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Record</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filter Bar */}
        {records.length > 0 && (
          <div className="relative mb-6">
            <Search
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course title, student name, or register number..."
              className={`w-full rounded-2xl border pl-10 pr-10 py-2.5 text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/15 shadow-2xs ${
                isDark
                  ? 'bg-[#121215] border-neutral-800 text-white placeholder:text-neutral-500 focus:border-[#8b5cf6]'
                  : 'bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-[#7c3aed]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer ${
                  isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {records.length === 0 ? (
          <div
            className={`flex flex-col items-center rounded-3xl border border-dashed p-12 text-center transition-all shadow-2xs ${
              isDark ? 'border-neutral-800 bg-[#121215]/50' : 'border-neutral-300 bg-white/70'
            }`}
          >
            <div
              className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
                isDark
                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                  : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
              }`}
            >
              <History className="h-6 w-6" />
            </div>
            <h3
              className={`text-base font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              No saved records yet
            </h3>
            <p
              className={`mt-1.5 max-w-sm text-xs sm:text-[13px] leading-relaxed ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              Create and preview your first lab record in the Editor. Records automatically sync to your workspace and cloud history.
            </p>
            <button
              onClick={() => handleCreateNewRecord()}
              type="button"
              className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                  : 'bg-neutral-950 text-white hover:bg-neutral-800'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Go to Editor</span>
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div
            className={`rounded-3xl border p-8 text-center ${
              isDark ? 'border-neutral-800 bg-[#121215]/40 text-neutral-400' : 'border-neutral-200 bg-white text-neutral-500'
            }`}
          >
            <p className="text-xs">No records match your search query &ldquo;{searchQuery}&rdquo;.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Records List */
          <div className="space-y-3.5">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className={`group flex flex-col gap-4 rounded-3xl border p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] backdrop-blur-xs transition-all sm:flex-row sm:items-center sm:justify-between ${
                  isDark
                    ? 'bg-[#121215] border-neutral-800/80 hover:border-neutral-700'
                    : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                {/* Record Info */}
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                      isDark
                        ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                        : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                    }`}
                  >
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`truncate font-bold text-sm sm:text-base tracking-tight ${
                        isDark ? 'text-white' : 'text-neutral-950'
                      }`}
                    >
                      {record.recordName || record.courseTitle || 'Untitled Record'}
                    </h3>
                    <p
                      className={`mt-1 text-xs flex items-center gap-1.5 flex-wrap ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      <span>{record.studentName || 'Student'}</span>
                      <span>·</span>
                      <span
                        className={`font-mono font-medium ${
                          isDark ? 'text-neutral-300' : 'text-neutral-700'
                        }`}
                      >
                        {record.registerNumber || 'No Register No'}
                      </span>
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          isDark
                            ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {record.experiments.length} exp{record.experiments.length === 1 ? '' : 's'}
                      </span>
                      <span
                        className={`text-[11px] flex items-center gap-1 ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {new Date(record.updatedAt).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* On-Demand Actions: Preview, DOCX, PDF, Edit, Delete */}
                <div
                  className={`flex flex-wrap items-center gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 ${
                    isDark ? 'border-neutral-800' : 'border-neutral-100'
                  }`}
                >
                  {/* On-Demand Preview Button (Dark mode: neutral-800, NOT white) */}
                  <button
                    onClick={() => handlePreviewRecord(record)}
                    type="button"
                    title="Preview Document"
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer ${
                      isDark
                        ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview</span>
                  </button>

                  {/* On-Demand DOCX */}
                  <button
                    onClick={() => handleDownloadDocx(record)}
                    disabled={isDownloadingDocxId === record.id}
                    type="button"
                    title="Download DOCX"
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                      isDark
                        ? 'border-blue-900/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50'
                        : 'border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {isDownloadingDocxId === record.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                    )}
                    <span>DOCX</span>
                  </button>

                  {/* On-Demand PDF */}
                  <button
                    onClick={() => handleDownloadPdf(record)}
                    disabled={isDownloadingPdfId === record.id}
                    type="button"
                    title="Download PDF"
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                      isDark
                        ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                        : 'bg-neutral-950 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {isDownloadingPdfId === record.id ? (
                      <Loader2
                        className={`h-3.5 w-3.5 animate-spin ${
                          isDark ? 'text-neutral-950' : 'text-white'
                        }`}
                      />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>PDF</span>
                  </button>

                  {/* Edit in Workspace */}
                  <button
                    onClick={() => handleOpenInEditor(record)}
                    type="button"
                    title="Edit in Workspace"
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer ${
                      isDark
                        ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50'
                    }`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    type="button"
                    title="Remove from history"
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition active:scale-95 cursor-pointer ${
                      isDark
                        ? 'text-neutral-400 hover:bg-rose-500/10 hover:text-rose-400'
                        : 'text-neutral-400 hover:bg-rose-50 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
              onClick={() => setShowClearConfirm(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className={`relative z-10 w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${
                isDark
                  ? 'bg-[#121215] border-neutral-800 text-white'
                  : 'bg-white border-neutral-200 text-neutral-950'
              }`}
            >
              <h3 className="text-base font-bold mb-2">Clear Record History?</h3>
              <p
                className={`text-xs mb-6 leading-relaxed ${
                  isDark ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                This will remove all saved local history records. Your existing cloud documents can still be re-opened if they were synced.
              </p>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  type="button"
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isDark
                      ? 'text-neutral-400 hover:bg-neutral-800'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearHistory}
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-xs"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bonafide Certificate Options Modal */}
      <AnimatePresence>
        {showBonafideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
              onClick={() => {
                setShowBonafideModal(false);
                setPendingPdfRecord(null);
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className={`relative z-10 w-full max-w-md rounded-3xl border p-6 sm:p-7 shadow-2xl ${
                isDark
                  ? 'bg-[#121215] border-neutral-800 text-white'
                  : 'bg-white border-neutral-200 text-neutral-950'
              }`}
            >
              <div
                className={`flex items-center justify-between pb-3 mb-4 border-b ${
                  isDark ? 'border-neutral-800' : 'border-neutral-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-500/10 text-violet-600'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold tracking-tight">PDF Export Options</h3>
                </div>
                <button
                  onClick={() => {
                    setShowBonafideModal(false);
                    setPendingPdfRecord(null);
                  }}
                  type="button"
                  className={`rounded-full p-1 transition cursor-pointer ${
                    isDark
                      ? 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                      : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p
                className={`text-xs sm:text-[13px] mb-6 leading-relaxed ${
                  isDark ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                Choose whether to merge the official college Bonafide Certificate page with this Lab Record PDF.
              </p>

              <div className="flex flex-col gap-3 mb-6">
                <button
                  onClick={() => handleBonafideChoice(true)}
                  type="button"
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98 ${
                    isDark
                      ? 'bg-white text-neutral-950 hover:bg-neutral-200'
                      : 'bg-neutral-950 text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>Download with Bonafide</span>
                </button>

                <button
                  onClick={() => handleBonafideChoice(false)}
                  type="button"
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition border flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                    isDark
                      ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <span>Download without Bonafide</span>
                </button>
              </div>

              <div
                className={`flex items-center gap-3 border-t pt-4 ${
                  isDark ? 'border-neutral-800' : 'border-neutral-100'
                }`}
              >
                <input
                  type="checkbox"
                  id="rememberHistoryChoice"
                  checked={rememberBonafideChoice}
                  onChange={(e) => setRememberBonafideChoice(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label
                  htmlFor="rememberHistoryChoice"
                  className={`text-xs select-none cursor-pointer ${
                    isDark ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  Remember my choice (prompts again after 20 downloads)
                </label>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* On-Demand Document Preview Modal */}
      {previewRecord && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewRecord(null);
          }}
          isDark={isDark}
          courseTitle={previewRecord.courseTitle}
          studentName={previewRecord.studentName}
          registerNumber={previewRecord.registerNumber}
          experiments={previewRecord.experiments}
        />
      )}
    </div>
  );
}
