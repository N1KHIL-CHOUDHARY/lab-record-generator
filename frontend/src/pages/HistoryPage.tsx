import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Pencil } from 'lucide-react';
import { getHistory } from '@/services/recordService';
import type { RecordItem } from '@/types';
import { Button } from '@/components/ui/button';
import { formatSubjectLine } from '@/utils/parseSubjectLine';

export function HistoryPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory()
      .then(setRecords)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <header className="mb-12">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your last 10 generated lab records.
        </p>
      </header>

      {records.length === 0 ? (
        <div className="border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">No records yet.</p>
          <Link to="/records/new">
            <Button variant="outline" className="mt-6">
              Create a record
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {records.map((record) => {
            const title = formatSubjectLine(
              record.subjectCode,
              record.subjectName,
              record.subjectCodeAlt
            );
            const subjectId = record.subjectId;

            return (
              <li key={record._id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {record.studentName} · {record.registerNumber} ·{' '}
                    {record.experiments.length} experiments ·{' '}
                    {new Date(record.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {record.docxUrl && (
                    <a href={record.docxUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Download Docx
                      </Button>
                    </a>
                  )}
                  {record.pdfUrl && (
                    <a href={record.pdfUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </Button>
                    </a>
                  )}
                  {subjectId && (
                    <Link to={`/records/${subjectId}`}>
                      <Button variant="default" size="sm" className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
