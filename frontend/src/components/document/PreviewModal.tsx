import { FileDown, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DocumentPreview, type DocumentPreviewData } from '@/components/document/DocumentPreview';
import type { RecordItem } from '@/types';
import { formatSubjectLine } from '@/utils/parseSubjectLine';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  previewData: DocumentPreviewData | null;
  exportResult: RecordItem | null;
  exporting?: boolean;
  onGenerateExports?: () => void;
}

export function PreviewModal({
  open,
  onClose,
  previewData,
  exportResult,
  exporting,
  onGenerateExports,
}: PreviewModalProps) {
  const title = previewData
    ? formatSubjectLine(
        previewData.subjectCode,
        previewData.subjectName,
        previewData.subjectCodeAlt
      )
    : '';

  const hasExports = Boolean(exportResult?.pdfUrl && exportResult?.docxUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-6xl">
        <DialogHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Document preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">{title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasExports ? (
                <>
                  <a href={exportResult!.pdfUrl} target="_blank" rel="noreferrer" download>
                    <Button type="button" className="gap-2">
                      <FileDown className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                  <a href={exportResult!.docxUrl} target="_blank" rel="noreferrer" download>
                    <Button type="button" variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Download DOCX
                    </Button>
                  </a>
                </>
              ) : (
                <Button type="button" className="gap-2" onClick={onGenerateExports} disabled={exporting}>
                  <FileDown className="h-4 w-4" />
                  {exporting ? 'Generating…' : 'Generate downloads'}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogBody>
          {previewData && <DocumentPreview data={previewData} embedded />}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
