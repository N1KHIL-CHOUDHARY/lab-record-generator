'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import { generatePDF } from '@/lib/document-generator';

export interface ExperimentItem {
  id: string;
  title: string;
  date: string;
  githubLink: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  courseTitle: string;
  studentName: string;
  registerNumber: string;
  experiments: ExperimentItem[];
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  isDark = false,
  courseTitle,
  studentName,
  registerNumber,
  experiments,
}: DocumentPreviewModalProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isPrinting, setIsPrinting] = useState(false);

  // Generate QR codes for all experiments
  useEffect(() => {
    let isMounted = true;

    const generatePreviews = async () => {
      const entries = await Promise.all(
        experiments.map(async (exp) => {
          if (!exp.githubLink) return [exp.id, ''] as const;
          try {
            const dataUrl = await QRCode.toDataURL(exp.githubLink, {
              errorCorrectionLevel: 'H',
              type: 'image/png',
              width: 120,
              margin: 1,
              color: { dark: '#000000', light: '#FFFFFF' },
            });
            return [exp.id, dataUrl] as const;
          } catch (error) {
            console.error('QR preview generation error:', error);
            return [exp.id, ''] as const;
          }
        })
      );

      if (isMounted) {
        setQrMap(Object.fromEntries(entries));
      }
    };

    if (isOpen) {
      generatePreviews();
    }

    return () => {
      isMounted = false;
    };
  }, [experiments, isOpen]);

  // Lock background scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const handlePrint = useCallback(async () => {
    try {
      setIsPrinting(true);
      const pdfBlob = (await generatePDF(
        {
          courseTitle: courseTitle.trim(),
          studentName: studentName.trim(),
          registerNumber: registerNumber.trim(),
          experiments,
        },
        true
      )) as Blob;

      if (!pdfBlob) {
        window.print();
        return;
      }

      const blobUrl = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          const printWin = window.open(blobUrl, '_blank');
          printWin?.focus();
          printWin?.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch (error) {
      console.error('Failed to generate PDF for printing:', error);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  }, [courseTitle, studentName, registerNumber, experiments]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          {/* Subtle Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 flex flex-col w-full h-full sm:h-[92vh] max-w-5xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden ${
              isDark
                ? 'border-neutral-800 bg-[#09090b] text-white'
                : 'border-neutral-200 bg-white text-neutral-950'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Document Preview"
          >
            {/* Sticky Header Toolbar */}
            <div
              className={`flex items-center justify-between px-5 sm:px-7 py-3.5 border-b backdrop-blur-md shrink-0 ${
                isDark
                  ? 'border-neutral-800 bg-[#121215]/95 text-white'
                  : 'border-neutral-200 bg-white/95 text-neutral-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                    isDark
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      : 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                  }`}
                >
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      className={`text-sm sm:text-base font-bold tracking-tight ${
                        isDark ? 'text-white' : 'text-neutral-950'
                      }`}
                    >
                      Document Preview
                    </h2>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        isDark
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      SEC Format Verified
                    </span>
                  </div>
                  <p
                    className={`text-[11px] ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {experiments.length} {experiments.length === 1 ? 'experiment' : 'experiments'} · Live QR code verification
                  </p>
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  type="button"
                  title="Print PDF Document"
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {isPrinting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{isPrinting ? 'Preparing...' : 'Print PDF'}</span>
                </button>

                <button
                  onClick={onClose}
                  type="button"
                  className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl border transition active:scale-95 cursor-pointer ${
                    isDark
                      ? 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Paper Container */}
            <div
              className={`overflow-auto flex-1 p-3 sm:p-6 lg:p-8 ${
                isDark ? 'bg-[#09090b]' : 'bg-neutral-100'
              }`}
            >
              <div
                id="document-preview-paper"
                style={{ fontFamily: 'Times New Roman, Times, serif' }}
                className="max-w-4xl mx-auto bg-white text-black p-6 sm:p-10 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-xl border border-neutral-200"
              >
                {/* Header with College Logo */}
                <div className="text-center mb-6 pb-4">
                  <img
                    src="/images/college-logo.png"
                    alt="College Logo"
                    className="w-full h-auto mb-4 max-w-md md:max-w-2xl mx-auto object-contain"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.tried) {
                        target.dataset.tried = 'true';
                        target.src = '/image/college-logo.png';
                      }
                    }}
                  />
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight text-black">
                    {courseTitle || 'Course Title'}
                  </h1>
                  <p className="text-lg sm:text-xl font-semibold mb-1 text-black">Table of content</p>
                </div>

                {/* Experiments Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse mb-10 min-w-[620px]">
                    <colgroup>
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '42%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border border-black bg-neutral-50/50">
                        <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base text-black">Exp</th>
                        <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base text-black">Date</th>
                        <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base text-black">
                          Name of The Experiment
                        </th>
                        <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base text-black">QR Code</th>
                        <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base text-black">Mark</th>
                        <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base text-black">Signature</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiments.length === 0 ? (
                        <tr className="border border-black">
                          <td colSpan={6} className="border border-black px-4 py-8 text-center text-gray-500 text-sm">
                            No experiments added yet.
                          </td>
                        </tr>
                      ) : (
                        experiments.map((exp, index) => (
                          <tr key={exp.id} className="border border-black">
                            <td className="border border-black px-3 py-2 text-center text-sm sm:text-base font-medium text-black">
                              {String(index + 1).padStart(2, '0')}
                            </td>
                            <td className="border border-black px-3 py-2 text-center text-sm sm:text-base whitespace-nowrap text-black">
                              {formatDate(exp.date)}
                            </td>
                            <td className="border border-black px-3 py-2 text-left">
                              <div className="text-sm sm:text-base font-bold text-black">{exp.title || 'Untitled Experiment'}</div>
                              {exp.githubLink && (
                                <a
                                  href={exp.githubLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline text-xs sm:text-sm break-all inline-block mt-0.5"
                                >
                                  {exp.githubLink}
                                </a>
                              )}
                            </td>
                            <td className="border border-black px-2 py-2 text-center h-24 align-middle">
                              {exp.githubLink && qrMap[exp.id] ? (
                                <div className="inline-flex items-center justify-center w-full">
                                  <img
                                    src={qrMap[exp.id]}
                                    alt={`QR for ${exp.title}`}
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto"
                                  />
                                </div>
                              ) : (
                                <div className="inline-flex w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 border border-dashed border-gray-300 items-center justify-center text-xs text-gray-500 rounded mx-auto">
                                  QR Code
                                </div>
                              )}
                            </td>
                            <td className="border border-black px-3 py-2 text-center"></td>
                            <td className="border border-black px-3 py-2 text-center"></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Declaration Section */}
                <div className="pt-2">
                  <p className="font-bold text-sm sm:text-base text-black">
                    I confirm that the experiments and GitHub links provided are entirely my own work.
                  </p>
                  <div className="h-10" />
                  <div className="grid grid-cols-1 gap-y-4 font-semibold text-sm sm:text-base md:grid-cols-2 md:gap-x-24 text-black">
                    <div className="text-left">
                      <span>Name : {studentName || '................................'}</span>
                    </div>
                    <div className="text-left">
                      <span>Register Number : {registerNumber || '................................'}</span>
                    </div>
                    <div className="text-left">
                      <span>Date :</span>
                    </div>
                    <div className="text-left">
                      <span>Learner&apos;s Signature</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Print Isolation Styles */}
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #document-preview-paper,
              #document-preview-paper * {
                visibility: visible !important;
              }
              #document-preview-paper {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 8mm !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
              }
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
