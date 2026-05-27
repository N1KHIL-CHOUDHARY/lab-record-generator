import { useEffect, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { getHistory, deleteRecord } from '@/services/recordService';
import type { RecordItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function HistoryPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getHistory()
      .then(setRecords)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record from history?')) return;
    await deleteRecord(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export History</h1>
        <p className="text-muted-foreground">Last 10 generated records (oldest auto-removed)</p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No export history yet. Generate a record from a subject preview.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record._id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{record.subjectName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {record.subjectCode} · {record.experiments.length} experiments
                  </p>
                </div>
                <Badge variant="secondary">
                  {new Date(record.createdAt).toLocaleDateString('en-IN')}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {record.pdfUrl && (
                  <a href={record.pdfUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </a>
                )}
                {record.docxUrl && (
                  <a href={record.docxUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-3 w-3" /> DOCX
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(record._id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
