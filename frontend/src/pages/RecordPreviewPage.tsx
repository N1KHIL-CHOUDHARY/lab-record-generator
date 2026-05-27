import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, FileText, Loader2 } from 'lucide-react';
import { getSubject } from '@/services/subjectService';
import { generateRecord } from '@/services/recordService';
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
          })),
        });
      })
      .catch(() => setError('Failed to load preview'))
      .finally(() => setLoading(false));
  }, [id]);

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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">{error || 'Preview unavailable'}</p>
        <Button variant="outline" className="mt-6" onClick={() => navigate(`/records/${id}`)}>
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
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <Link to={`/records/${id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Document preview</h1>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(exportResult?.pdfUrl || exportResult?.docxUrl) && (
              <>
                {exportResult.pdfUrl && (
                  <a href={exportResult.pdfUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileDown className="h-4 w-4" />
                      PDF
                    </Button>
                  </a>
                )}
                {exportResult.docxUrl && (
                  <a href={exportResult.docxUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      DOCX
                    </Button>
                  </a>
                )}
              </>
            )}
            <Button size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Generate PDF
            </Button>
          </div>
        </div>
        {error && (
          <p className="border-t border-border px-6 py-2 text-sm text-destructive">{error}</p>
        )}
      </header>
      <DocumentPreview data={previewData} />
    </div>
  );
}
