'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();

  const [records, setRecords] = useState<SavedRecord[]>([]);
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

  const handleClearAllHistory = () => {
    if (records.length === 0) return;
    if (window.confirm('Are you sure you want to clear all history records?')) {
      setRecords([]);
      try {
        localStorage.removeItem('labora_records_history');
        showToast('All history records cleared.');
      } catch (e) {
        console.error('Failed to clear history:', e);
      }
    }
  };

  const handleCreateNewRecord = () => {
    try {
      localStorage.removeItem('labora_active_workspace');
      router.push('/dashboard?new=true');
    } catch (e) {
      console.error('Failed to prepare new record workspace:', e);
      router.push('/dashboard?new=true');
    }
  };

  const handleOpenInEditor = (record: SavedRecord) => {
    try {
      localStorage.setItem(
        'labora_active_workspace',
        JSON.stringify({
          id: String(record.id),
          courseTitle: record.courseTitle,
          studentName: record.studentName,
          registerNumber: record.registerNumber,
          experiments: record.experiments.map((exp, i) => ({
            id: exp.id || `exp-${i + 1}`,
            title: exp.title || '',
            date: exp.date || '',
            githubLink: exp.githubLink || '',
          })),
          updatedAt: new Date().toISOString(),
        })
      );
      router.push('/dashboard');
    } catch (e) {
      console.error('Failed to set active workspace for edit:', e);
    }
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

  if (loading || !user) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Loading your history...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-150 pb-28 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}
    >
      <Header check={false} />

      {/* Notification Toast (Theme Aware) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl backdrop-blur-md transition-all ${
            isDark
              ? 'border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-black/40'
              : 'border-zinc-200 bg-white/95 text-zinc-900 shadow-zinc-900/10'
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
        </div>
      )}

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Header Title & Controls Section */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Record History</h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {records.length > 0
                ? `Showing ${records.length} saved lab record${
                    records.length === 1 ? '' : 's'
                  }. Preview or export on-demand at any time.`
                : 'Your generated and saved lab records will appear here.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {records.length > 0 && (
              <button
                onClick={() => handleClearAllHistory()}
                type="button"
                className={`text-xs px-3 py-2 rounded-xl font-medium transition active:scale-95 ${
                  isDark
                    ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10'
                    : 'text-zinc-500 hover:text-rose-600 hover:bg-rose-50'
                }`}
              >
                Clear History
              </button>
            )}

            <button
              onClick={() => handleCreateNewRecord()}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-xs font-semibold shadow-sm transition hover:bg-zinc-800 dark:hover:bg-white active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Record</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {records.length === 0 ? (
          <div
            className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
              isDark
                ? 'border-zinc-800/80 bg-zinc-900/30'
                : 'border-zinc-200 bg-white shadow-xs'
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold">No records yet</h3>
            <p className="mt-1.5 max-w-xs text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Create your first lab record in the Editor to preview, export DOCX, or download PDF anytime.
            </p>
            <button
              onClick={() => handleCreateNewRecord()}
              type="button"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4.5 py-2.5 text-xs font-semibold shadow-sm transition hover:bg-zinc-800 dark:hover:bg-white active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Go to Editor</span>
            </button>
          </div>
        ) : (
          /* Records List: Displays Pure Input Data with Immediate Export & Preview Actions */
          <div className="space-y-3.5">
            {records.map((record) => (
              <div
                key={record.id}
                className={`group flex flex-col gap-4 rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${
                  isDark
                    ? 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Record Info */}
                <div className="flex min-w-0 items-start gap-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-sm">
                      {record.recordName || record.courseTitle || 'Untitled Record'}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {record.studentName || 'Unknown Student'} ·{' '}
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">
                        {record.registerNumber || 'No Register No'}
                      </span>
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {record.experiments.length} exp{record.experiments.length === 1 ? '' : 's'}
                      </span>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
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
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {/* On-Demand Preview */}
                  <button
                    onClick={() => handlePreviewRecord(record)}
                    type="button"
                    title="Preview Document"
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                      isDark
                        ? 'border-zinc-700 bg-zinc-850 text-zinc-200 hover:bg-zinc-750'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 shadow-xs'
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
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                      isDark
                        ? 'border-blue-900/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50'
                        : 'border-blue-200 bg-blue-50/80 text-blue-700 hover:bg-blue-100 shadow-xs'
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
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${
                      isDark
                        ? 'border-rose-900/50 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                        : 'border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100 shadow-xs'
                    }`}
                  >
                    {isDownloadingPdfId === record.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />
                    ) : (
                      <Download className="h-3.5 w-3.5 text-rose-500" />
                    )}
                    <span>PDF</span>
                  </button>

                  {/* Edit in Workspace */}
                  <button
                    onClick={() => handleOpenInEditor(record)}
                    type="button"
                    title="Edit in Workspace"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    type="button"
                    title="Remove from history"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-600 active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bonafide Certificate Options Modal for On-Demand PDF Downloads */}
      {showBonafideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
              isDark ? 'bg-[#121212] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <h3 className="text-xl font-bold mb-2">Download PDF Options</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Would you like to merge the Bonafide Certificate with this Lab Record PDF?
            </p>

            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={() => handleBonafideChoice(true)}
                type="button"
                className="w-full py-3 px-4 rounded-xl font-semibold transition bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-lg"
              >
                Download with Bonafide
              </button>
              <button
                onClick={() => handleBonafideChoice(false)}
                type="button"
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
              style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}
            >
              <input
                type="checkbox"
                id="rememberHistoryChoice"
                checked={rememberBonafideChoice}
                onChange={(e) => setRememberBonafideChoice(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="rememberHistoryChoice"
                className={`text-sm select-none cursor-pointer ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Remember my choice (asks again after 20 downloads)
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowBonafideModal(false);
                  setPendingPdfRecord(null);
                }}
                type="button"
                className={`text-xs underline ${
                  isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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