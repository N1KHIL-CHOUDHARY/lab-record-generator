import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Pencil, History as HistoryIcon, Plus } from 'lucide-react';
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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {records.length > 0
              ? `Your last ${records.length} generated lab record${records.length === 1 ? '' : 's'}.`
              : 'Your generated lab records will appear here.'}
          </p>
        </div>
        {records.length > 0 && (
          <Link to="/records/new">
            <Button size="sm" className="h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold">
              <Plus className="h-3.5 w-3.5" />
              New record
            </Button>
          </Link>
        )}
      </header>

      {records.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <HistoryIcon className="h-5 w-5" />
          </div>
          <p className="text-base font-semibold text-foreground">No records yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Create your first lab record and export it to access it in history anytime.
          </p>
          <Link to="/records/new">
            <Button className="mt-6 h-9.5 rounded-xl px-5 text-xs font-semibold">
              Create a record
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {records.map((record) => {
            const title = formatSubjectLine(
              record.subjectCode,
              record.subjectName,
              record.subjectCodeAlt
            );
            const subjectId = record.subjectId;

            return (
              <li
                key={record._id}
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-[#6351ce]/40 dark:hover:border-[#9d8df2]/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="mt-0.5 flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {record.studentName} · <span className="font-mono">{record.registerNumber}</span>
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {record.experiments.length} exp{record.experiments.length === 1 ? '' : 's'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(record.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  {record.docxUrl && (
                    <a href={record.docxUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8.5 gap-1.5 rounded-xl border-border px-3 text-xs text-foreground hover:bg-muted">
                        <FileText className="h-3.5 w-3.5" />
                        DOCX
                      </Button>
                    </a>
                  )}
                  {record.pdfUrl && (
                    <a href={record.pdfUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8.5 gap-1.5 rounded-xl border-border px-3 text-xs text-foreground hover:bg-muted">
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </a>
                  )}
                  {subjectId && (
                    <Link to={`/records/${subjectId}`}>
                      <Button variant="default" size="sm" className="h-8.5 gap-1.5 rounded-xl px-3.5 text-xs font-semibold">
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