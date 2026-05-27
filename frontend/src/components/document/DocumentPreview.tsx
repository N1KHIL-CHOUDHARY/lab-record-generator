import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/utils';
import {
  buildCourseTitleLine,
  formatTableDate,
  padExpNo,
  SUBTITLE_TEXT,
  FOOTER_DECLARATION,
} from '@/lib/documentSpec';
import { cn } from '@/lib/utils';
import '@/styles/lab-document.css';

export interface PreviewExperiment {
  experimentNo: number;
  experimentName: string;
  experimentDate: string;
  githubLink: string;
  qrImage?: string;
}

export interface DocumentPreviewData {
  subjectCode: string;
  subjectCodeAlt?: string;
  subjectName: string;
  studentName: string;
  registerNumber: string;
  experiments: PreviewExperiment[];
}

const ZOOM_LEVELS = [0.55, 0.7, 0.85, 1] as const;

interface DocumentPreviewProps {
  data: DocumentPreviewData;
  className?: string;
  embedded?: boolean;
}

export function DocumentPreview({ data, className, embedded }: DocumentPreviewProps) {
  const [zoomIndex, setZoomIndex] = useState(embedded ? 1 : 2);
  const zoom = ZOOM_LEVELS[zoomIndex];

  const courseTitle = buildCourseTitleLine(
    data.subjectCode,
    data.subjectName,
    data.subjectCodeAlt
  );

  return (
    <div
      className={cn(
        'lab-doc-root',
        embedded && 'lab-doc-root--embedded',
        className
      )}
    >
      <div className="lab-doc-toolbar">
        <span className="text-xs font-medium text-muted-foreground">Zoom</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={zoomIndex === 0}
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto gap-1 text-xs"
          onClick={() => setZoomIndex(embedded ? 1 : 2)}
        >
          <Maximize2 className="h-3 w-3" />
          Fit
        </Button>
      </div>

      <div className="lab-doc-canvas-wrap">
        <div className="lab-doc-paper" style={{ transform: `scale(${zoom})` }}>
          <div className="lab-doc">
            <img className="banner" src="/college-banner.png" alt="College banner" />
            <p className="course-title">{courseTitle}</p>
            <p className="subtitle">{SUBTITLE_TEXT}</p>

            <table className="lab-table">
              <colgroup>
                <col className="col-exp" />
                <col className="col-date" />
                <col className="col-name" />
                <col className="col-qr" />
                <col className="col-mark" />
                <col className="col-sig" />
              </colgroup>
              <thead>
                <tr>
                  <th>Exp</th>
                  <th>Date</th>
                  <th>Name of The Experiment</th>
                  <th>QR Code</th>
                  <th>Mark</th>
                  <th>Signature</th>
                </tr>
              </thead>
              <tbody>
                {data.experiments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="cell-empty">
                      No experiments in this preview.
                    </td>
                  </tr>
                ) : (
                  data.experiments.map((exp) => (
                    <tr key={`${exp.experimentNo}-${exp.qrImage ?? exp.githubLink}`}>
                      <td className="cell-exp">{padExpNo(exp.experimentNo)}</td>
                      <td className="cell-date">{formatTableDate(exp.experimentDate)}</td>
                      <td className="cell-name">
                        <div className="exp-title">{exp.experimentName}</div>
                        {exp.githubLink ? (
                          <a href={exp.githubLink} target="_blank" rel="noreferrer">
                            {exp.githubLink}
                          </a>
                        ) : (
                          <span className="link-placeholder">GitHub URL</span>
                        )}
                      </td>
                      <td className="cell-qr">
                        {exp.qrImage ? (
                          <img src={`${API_URL}${exp.qrImage}`} alt="QR" />
                        ) : (
                          <span className="qr-placeholder">QR</span>
                        )}
                      </td>
                      <td className="cell-mark" />
                      <td className="cell-sig" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <p className="footer-declaration">{FOOTER_DECLARATION}</p>
            <table className="footer-grid">
              <tbody>
                <tr>
                  <td className="footer-left">Name : {data.studentName || '—'}</td>
                  <td className="footer-right">
                    Register Number : {data.registerNumber || '—'}
                  </td>
                </tr>
                <tr className="footer-spacer">
                  <td className="footer-left">Date :</td>
                  <td className="footer-right">Learner&apos;s Signature</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
