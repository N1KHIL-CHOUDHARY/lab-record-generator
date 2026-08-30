import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, FileText, Loader2, Download } from 'lucide-react';
import { getSubject } from '@/services/subjectService';
import { generateRecord, fetchSubjectPdfPreviewBlob, fetchRecordPdfBlob } from '@/services/recordService';
import { DocumentPreview, type DocumentPreviewData } from '@/components/document/DocumentPreview';
import { Button } from '@/components/ui/button';
import type { RecordItem } from '@/types';
import { formatSubjectLine } from '@/utils/parseSubjectLine';

export function RecordPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [previewData, setPreviewData] = useState<DocumentPreviewData | null>(null);
  const [exportResult, setExportResult] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getSubject(id)
      .then(({ subject, experiments }) => {
        setPreviewData({
          subjectCode: subject.subjectCode,
          subjectCodeAlt: subject.subjectCodeAlt,
          subjectName: subject.subjectName,
          studentName: subject.studentName,
          registerNumber: subject.registerNumber,
          experiments: experiments.map((e) => ({
            experimentNo: e.experimentNo,
            experimentName: e.experimentName,
            experimentDate: e.experimentDate,
            githubLink: e.githubLink,
            qrImage: e.qrImage,
            qrShortId: e.qrShortId,
          })),
        });
      })
      .catch(() => setError('Failed to load preview'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadDirectPdf = async () => {
    if (!id) return;
    setDownloadingPdf(true);
    setError('');
    try {
      let blob: Blob;
      if (exportResult?._id) {
        blob = await fetchRecordPdfBlob(exportResult._id);
      } else {
        blob = await fetchSubjectPdfPreviewBlob(id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = previewData
        ? `lab-record-${previewData.subjectCode.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        : 'lab-record.pdf';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to download PDF stream';
      setError(msg || 'Failed to download PDF stream');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    setError('');
    try {
      const result = await generateRecord(id);
      setExportResult(result);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Export failed';
      setError(msg || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">{error || 'Preview unavailable'}</p>
        <Button variant="outline" className="mt-6 rounded-lg" onClick={() => navigate(`/records/${id}`)}>
          Back to editor
        </Button>
      </div>
    );
  }

  const title = formatSubjectLine(
    previewData.subjectCode,
    previewData.subjectName,
    previewData.subjectCodeAlt
  );

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to={`/records/${id}`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Document Preview
              </p>
              <h1 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">{title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              className="h-9 gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              onClick={handleDownloadDirectPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>

            {exportResult?.docxUrl && (
              <a href={exportResult.docxUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-border px-3 text-xs text-foreground hover:bg-muted">
                  <FileText className="h-3.5 w-3.5" />
                  DOCX
                </Button>
              </a>
            )}

            {!exportResult && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl border-border px-3.5 text-xs font-medium text-foreground hover:bg-muted"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Save to History
              </Button>
            )}
          </div>
        </div>
        {error && (
          <p className="border-t border-destructive/20 bg-destructive/10 px-6 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </header>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <DocumentPreview data={previewData} />
      </div>
    </div>
  );
}