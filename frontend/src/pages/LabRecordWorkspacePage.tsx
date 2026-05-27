import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { workspaceSchema, experimentRowSchema, type WorkspaceFormData } from '@/utils/validators';
import { parseSubjectLine, formatSubjectLine } from '@/utils/parseSubjectLine';
import { createSubject, getSubject, updateSubject } from '@/services/subjectService';
import {
  createExperiment,
  deleteExperiment,
  updateExperiment,
} from '@/services/experimentService';
import type { ExperimentRowState } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function newRow(no: number): ExperimentRowState {
  return {
    localId: crypto.randomUUID(),
    experimentNo: no,
    experimentName: '',
    experimentDate: new Date().toISOString().slice(0, 10),
    githubLink: '',
  };
}

export function LabRecordWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string | undefined>(id);
  const [rows, setRows] = useState<ExperimentRowState[]>([newRow(1)]);
  const [loading, setLoading] = useState(Boolean(id));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      subjectLine: '',
      studentName: '',
      registerNumber: '',
    },
  });

  const loadSubject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getSubject(id);
      setSubjectId(data.subject._id);
      form.reset({
        subjectLine: formatSubjectLine(
          data.subject.subjectCode,
          data.subject.subjectName,
          data.subject.subjectCodeAlt
        ),
        studentName: data.subject.studentName,
        registerNumber: data.subject.registerNumber,
      });
      if (data.experiments.length > 0) {
        setRows(
          data.experiments.map((e) => ({
            localId: e._id,
            _id: e._id,
            experimentNo: e.experimentNo,
            experimentName: e.experimentName,
            experimentDate: e.experimentDate.slice(0, 10),
            githubLink: e.githubLink,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (id) loadSubject();
  }, [id, loadSubject]);

  const updateRow = (localId: string, patch: Partial<ExperimentRowState>) => {
    setRows((prev) => prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, newRow(prev.length + 1)]);
  };

  const removeRow = (localId: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.localId !== localId)));
  };

  const syncExperiments = async (sid: string) => {
    const existing = id ? (await getSubject(sid)).experiments : [];
    const existingIds = new Set(rows.filter((r) => r._id).map((r) => r._id!));

    for (const exp of existing) {
      if (!existingIds.has(exp._id)) {
        await deleteExperiment(exp._id);
      }
    }

    for (const row of rows) {
      const payload = {
        experimentNo: row.experimentNo,
        experimentName: row.experimentName.trim(),
        experimentDate: row.experimentDate,
        githubLink: row.githubLink.trim(),
      };
      if (row._id) {
        await updateExperiment(row._id, payload);
      } else {
        await createExperiment(sid, payload);
      }
    }
  };

  const handleGeneratePreview = async () => {
    setError('');
    const valid = await form.trigger();
    if (!valid) return;

    for (const row of rows) {
      const result = experimentRowSchema.safeParse(row);
      if (!result.success) {
        setError(result.error.errors[0]?.message ?? 'Complete all experiment fields');
        return;
      }
    }

    setGenerating(true);
    try {
      const { subjectLine, studentName, registerNumber } = form.getValues();
      const parsed = parseSubjectLine(subjectLine);
      const payload = { ...parsed, studentName, registerNumber };

      let sid = subjectId;
      if (sid) {
        await updateSubject(sid, payload);
      } else {
        const created = await createSubject(payload);
        sid = created._id;
        setSubjectId(sid);
      }

      await syncExperiments(sid);
      navigate(`/records/${sid}/preview`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : 'Failed to generate preview';
      setError(msg || 'Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {id ? 'Edit lab record' : 'New lab record'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fill in your details, then generate a print-ready preview.
        </p>
      </header>

      {error && (
        <div className="mb-8 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        className="space-y-12"
        onSubmit={(e) => {
          e.preventDefault();
          handleGeneratePreview();
        }}
      >
        <section className="space-y-6">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Course
          </h2>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="subjectLine" className="text-sm font-medium">
                Subject
              </Label>
              <Input
                id="subjectLine"
                placeholder="19MA220/SH2220 - Mathematics for Artificial Intelligence"
                className="h-11 border-border bg-background"
                {...form.register('subjectLine')}
              />
              {form.formState.errors.subjectLine && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.subjectLine.message}
                </p>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="studentName" className="text-sm font-medium">
                  Student name
                </Label>
                <Input
                  id="studentName"
                  className="h-11 border-border bg-background"
                  {...form.register('studentName')}
                />
                {form.formState.errors.studentName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.studentName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerNumber" className="text-sm font-medium">
                  Register number
                </Label>
                <Input
                  id="registerNumber"
                  className="h-11 border-border bg-background"
                  {...form.register('registerNumber')}
                />
                {form.formState.errors.registerNumber && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.registerNumber.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Experiments
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add row
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.localId}
                className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-12 sm:items-end"
              >
                <div className="space-y-1.5 sm:col-span-1">
                  <Label className="text-xs text-muted-foreground">No.</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-10 border-border bg-background"
                    value={row.experimentNo}
                    onChange={(e) =>
                      updateRow(row.localId, { experimentNo: Number(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    className="h-10 border-border bg-background"
                    value={row.experimentDate}
                    onChange={(e) => updateRow(row.localId, { experimentDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs text-muted-foreground">Experiment</Label>
                  <Input
                    className="h-10 border-border bg-background"
                    placeholder="Experiment name"
                    value={row.experimentName}
                    onChange={(e) => updateRow(row.localId, { experimentName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-5">
                  <Label className="text-xs text-muted-foreground">GitHub URL</Label>
                  <Input
                    className="h-10 border-border bg-background"
                    placeholder="https://github.com/user/repo"
                    value={row.githubLink}
                    onChange={(e) => updateRow(row.localId, { githubLink: e.target.value })}
                  />
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.localId)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-border pt-10">
          <Button type="submit" className="h-12 w-full text-sm font-medium" disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating preview…
              </>
            ) : (
              'Generate Preview'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
