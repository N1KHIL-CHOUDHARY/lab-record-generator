import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Trash2,
  GripVertical,
  FileDown,
  FileText,
  Loader2,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { subjectSchema, type SubjectFormData } from '@/utils/validators';
import { createSubject, getSubject, updateSubject } from '@/services/subjectService';
import {
  createExperiment,
  deleteExperiment,
  reorderExperiments,
  updateExperiment,
} from '@/services/experimentService';
import { generateRecord } from '@/services/recordService';
import type { Experiment, Subject, RecordItem } from '@/types';
import { DocumentPreview, type DocumentPreviewData } from '@/components/document/DocumentPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

const emptyExperiment = (): Partial<Experiment> & { localId: string } => ({
  localId: crypto.randomUUID(),
  experimentNo: 1,
  experimentName: '',
  experimentDate: new Date().toISOString().slice(0, 10),
  githubLink: '',
});

export function LabRecordWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [step, setStep] = useState<Step>(1);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [draftRows, setDraftRows] = useState<(Partial<Experiment> & { localId: string })[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<RecordItem | null>(null);
  const [error, setError] = useState('');

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      subjectCode: '',
      subjectCodeAlt: '',
      subjectName: '',
      studentName: '',
      registerNumber: '',
    },
  });

  const loadSubject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getSubject(id);
      setSubject(data.subject);
      setExperiments(data.experiments);
      form.reset({
        subjectCode: data.subject.subjectCode,
        subjectCodeAlt: data.subject.subjectCodeAlt ?? '',
        subjectName: data.subject.subjectName,
        studentName: data.subject.studentName,
        registerNumber: data.subject.registerNumber,
      });
      if (data.experiments.length > 0) setStep(2);
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (isEdit) loadSubject();
  }, [isEdit, loadSubject]);

  const previewData: DocumentPreviewData = {
    subjectCode: form.watch('subjectCode'),
    subjectCodeAlt: form.watch('subjectCodeAlt') || undefined,
    subjectName: form.watch('subjectName'),
    studentName: form.watch('studentName'),
    registerNumber: form.watch('registerNumber'),
    experiments:
      experiments.length > 0
        ? experiments.map((e) => ({
            experimentNo: e.experimentNo,
            experimentName: e.experimentName,
            experimentDate: e.experimentDate,
            githubLink: e.githubLink,
            qrImage: e.qrImage,
          }))
        : draftRows.map((r, i) => ({
            experimentNo: r.experimentNo ?? i + 1,
            experimentName: r.experimentName ?? '',
            experimentDate: r.experimentDate ?? new Date().toISOString(),
            githubLink: r.githubLink ?? '',
          })),
  };

  const saveCourseInfo = async () => {
    const valid = await form.trigger();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      const data = form.getValues();
      if (subject?._id) {
        const updated = await updateSubject(subject._id, data);
        setSubject(updated);
      } else {
        const created = await createSubject(data);
        setSubject(created);
        navigate(`/records/${created._id}`, { replace: true });
      }
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addDraftRow = () => {
    setDraftRows((rows) => [
      ...rows,
      { ...emptyExperiment(), experimentNo: rows.length + experiments.length + 1 },
    ]);
  };

  const saveExperimentRow = async (row: Partial<Experiment> & { localId: string }) => {
    if (!subject?._id) return;
    const payload = {
      experimentNo: Number(row.experimentNo),
      experimentName: row.experimentName ?? '',
      experimentDate: row.experimentDate ?? '',
      githubLink: row.githubLink ?? '',
    };
    if (row._id) {
      await updateExperiment(row._id, payload);
    } else {
      await createExperiment(subject._id, payload);
    }
    await loadSubject();
    setDraftRows((rows) => rows.filter((r) => r.localId !== row.localId));
  };

  const handleExportPdf = async () => {
    if (!subject?._id) return;
    setExporting(true);
    setError('');
    try {
      const result = await generateRecord(subject._id);
      setExportResult(result);
      setStep(3);
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
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  const steps = [
    { n: 1 as Step, label: 'Course' },
    { n: 2 as Step, label: 'Experiments' },
    { n: 3 as Step, label: 'Export' },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:-m-8">
      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm lg:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {isEdit ? 'Edit lab record' : 'New lab record'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Official college format · live preview
          </p>
        </div>
        <nav className="flex items-center gap-1">
          {steps.map(({ n, label }, i) => (
            <div key={n} className="flex items-center">
              <button
                type="button"
                onClick={() => n <= step && setStep(n)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  step === n
                    ? 'bg-foreground text-background'
                    : step > n
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                    step > n ? 'bg-emerald-500 text-white' : 'bg-muted'
                  )}
                >
                  {step > n ? <Check className="h-3 w-3" /> : n}
                </span>
                {label}
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="mx-0.5 h-3 w-3 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </nav>
        <div className="flex gap-2">
          {step >= 2 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => setStep(2)}
              >
                Preview
              </Button>
              <Button
                size="sm"
                onClick={handleExportPdf}
                disabled={exporting || experiments.length === 0}
              >
                {exporting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                )}
                Generate PDF
              </Button>
            </>
          )}
        </div>
      </header>

      {error && (
        <p className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive lg:px-6">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Editor panel */}
        <aside className="w-full shrink-0 overflow-y-auto border-b border-border bg-background p-4 lg:w-[380px] lg:border-b-0 lg:border-r lg:p-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-medium">Course information</h2>
                <p className="text-xs text-muted-foreground">Appears in the document header</p>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Subject code</Label>
                    <Input
                      placeholder="19MA220"
                      className="h-9 text-sm"
                      {...form.register('subjectCode')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Alt code</Label>
                    <Input
                      placeholder="SH2220"
                      className="h-9 text-sm"
                      {...form.register('subjectCodeAlt')}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subject title</Label>
                  <Input
                    placeholder="Mathematics for Artificial Intelligence"
                    className="h-9 text-sm"
                    {...form.register('subjectName')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student name</Label>
                  <Input className="h-9 text-sm" {...form.register('studentName')} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Register number</Label>
                  <Input className="h-9 text-sm" {...form.register('registerNumber')} />
                </div>
              </div>
              <Button className="w-full" size="sm" onClick={saveCourseInfo} disabled={saving}>
                {saving ? 'Saving…' : 'Continue'}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && subject && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium">Experiments</h2>
                  <p className="text-xs text-muted-foreground">Inline table editor</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addDraftRow}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {experiments.length > 0 && (
                <Reorder.Group
                  axis="y"
                  values={experiments}
                  onReorder={async (next) => {
                    setExperiments(next);
                    await reorderExperiments(
                      subject._id,
                      next.map((e) => e._id)
                    );
                  }}
                  className="space-y-2"
                >
                  {experiments.map((exp) => (
                    <Reorder.Item
                      key={exp._id}
                      value={exp}
                      className="rounded-lg border border-border bg-card p-2.5"
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          #{String(exp.experimentNo).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium">{exp.experimentName}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{exp.githubLink}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-7 text-xs text-destructive"
                        onClick={async () => {
                          await deleteExperiment(exp._id);
                          loadSubject();
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove
                      </Button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}

              {draftRows.map((row) => (
                <DraftRowEditor
                  key={row.localId}
                  row={row}
                  onChange={(patch) =>
                    setDraftRows((rows) =>
                      rows.map((r) => (r.localId === row.localId ? { ...r, ...patch } : r))
                    )
                  }
                  onSave={() => saveExperimentRow(row)}
                  onRemove={() =>
                    setDraftRows((rows) => rows.filter((r) => r.localId !== row.localId))
                  }
                />
              ))}

              {experiments.length === 0 && draftRows.length === 0 && (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Add an experiment row to begin
                </p>
              )}

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setStep(3)}
              >
                Open full preview
              </Button>
            </div>
          )}

          {step === 3 && exportResult && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium">Downloads ready</h2>
              <div className="flex flex-col gap-2">
                {exportResult.pdfUrl && (
                  <a href={exportResult.pdfUrl} target="_blank" rel="noreferrer">
                    <Button className="w-full gap-2" size="sm">
                      <FileDown className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </a>
                )}
                {exportResult.docxUrl && (
                  <a href={exportResult.docxUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <FileText className="h-4 w-4" />
                      Download DOCX
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Preview panel */}
        <section className="min-h-0 flex-1 overflow-hidden bg-muted/40">
          <DocumentPreview data={previewData} className="!min-h-full" />
        </section>
      </div>

      {/* Mobile floating export */}
      {step >= 2 && experiments.length > 0 && (
        <div className="fixed bottom-4 right-4 z-10 flex gap-2 lg:hidden">
          <Button size="sm" onClick={handleExportPdf} disabled={exporting}>
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function DraftRowEditor({
  row,
  onChange,
  onSave,
  onRemove,
}: {
  row: Partial<Experiment> & { localId: string };
  onChange: (patch: Partial<Experiment>) => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-card p-2.5">
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px]">No.</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={row.experimentNo ?? ''}
            onChange={(e) => onChange({ experimentNo: Number(e.target.value) })}
          />
        </div>
        <div className="col-span-3 space-y-0.5">
          <Label className="text-[10px]">Date</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={String(row.experimentDate ?? '').slice(0, 10)}
            onChange={(e) => onChange({ experimentDate: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px]">Experiment name</Label>
        <Input
          className="h-8 text-xs"
          value={row.experimentName ?? ''}
          onChange={(e) => onChange({ experimentName: e.target.value })}
        />
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px]">GitHub URL</Label>
        <Input
          className="h-8 text-xs"
          placeholder="https://github.com/user/repo"
          value={row.githubLink ?? ''}
          onChange={(e) => onChange({ githubLink: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-8 flex-1 text-xs" onClick={onSave}>
          Save row
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
