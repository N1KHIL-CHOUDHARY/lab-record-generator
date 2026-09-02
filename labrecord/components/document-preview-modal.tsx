'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import QRCode from 'qrcode';

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 overflow-hidden pointer-events-none">
        <div
          className={`pointer-events-auto w-full h-full sm:h-[90vh] max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border ${
            isDark
              ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
              : 'bg-white border-zinc-200 text-zinc-900'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b ${
              isDark
                ? 'border-zinc-800/80 bg-zinc-900/80'
                : 'border-zinc-200 bg-zinc-50/80'
            }`}
          >
            <div>
              <h2 className="text-base sm:text-lg font-bold">Document Preview</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Live preview of the generated autonomous lab record
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition ${
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                  : 'hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Preview Content */}
          <div className="overflow-auto flex-1 p-4 sm:p-6 lg:p-8 bg-zinc-100 dark:bg-zinc-900/90">
            <div
              style={{ fontFamily: 'Times New Roman, Times, serif' }}
              className="max-w-4xl mx-auto bg-white text-black p-6 sm:p-10 shadow-lg rounded-xl border border-neutral-200"
            >
              {/* Header with Logo */}
              <div className="text-center mb-4 pb-4">
                <img
                  src="/images/college-logo.png"
                  alt="College Logo"
                  className="w-full h-auto mb-4 max-w-md md:max-w-2xl mx-auto object-contain"
                  onError={(e) => {
                    // Fallback to /image/college-logo.png if needed
                    const target = e.currentTarget;
                    if (!target.dataset.tried) {
                      target.dataset.tried = 'true';
                      target.src = '/image/college-logo.png';
                    }
                  }}
                />
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">{courseTitle || 'Course Title'}</h1>
                <p className="text-lg sm:text-xl font-semibold mb-1">Table of content</p>
              </div>

              {/* Table */}
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
                      <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base">Exp</th>
                      <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base">Date</th>
                      <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base">
                        Name of The Experiment
                      </th>
                      <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base">QR Code</th>
                      <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base">Mark</th>
                      <th className="border border-black px-3 py-2.5 text-center font-bold text-sm sm:text-base">Signature</th>
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
                          <td className="border border-black px-3 py-2 text-center text-sm sm:text-base font-medium">
                            {String(index + 1).padStart(2, '0')}
                          </td>
                          <td className="border border-black px-3 py-2 text-center text-sm sm:text-base whitespace-nowrap">
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

              {/* Declaration */}
              <div className="pt-2">
                <p className="font-bold text-sm sm:text-base">
                  I confirm that the experiments and GitHub links provided are entirely my own work.
                </p>
                <div className="h-10" />
                <div className="grid grid-cols-1 gap-y-4 font-semibold text-sm sm:text-base md:grid-cols-2 md:gap-x-24">
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
                    <span>Learner's Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
