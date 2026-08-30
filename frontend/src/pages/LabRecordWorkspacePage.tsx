import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Loader2, QrCode, CheckCircle2, RefreshCw } from 'lucide-react';
import { workspaceSchema, experimentRowSchema, type WorkspaceFormData } from '@/utils/validators';
import { parseSubjectLine, formatSubjectLine } from '@/utils/parseSubjectLine';
import { createSubject, getSubject, updateSubject } from '@/services/subjectService';
import {
  createExperiment,
  deleteExperiment,
  updateExperiment,
} from '@/services/experimentService';
import { updateDynamicQr } from '@/services/qrService';
import type { ExperimentRowState } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function newRow(experimentNo = 1): ExperimentRowState {
  return {
    localId: crypto.randomUUID(),
    experimentNo,
    experimentName: '',
    experimentDate: '',
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
  const [feedbackMsg, setFeedbackMsg] = useState('');

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
      setSubjectId(data.subject._id || data.subject.id);
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
            localId: e._id || e.id || crypto.randomUUID(),
            _id: e._id || e.id,
            id: e.id || e._id,
            experimentNo: e.experimentNo,
            experimentName: e.experimentName,
            experimentDate: e.experimentDate.slice(0, 10),
            githubLink: e.githubLink,
            qrShortId: e.qrShortId,
            qrImage: e.qrImage,
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

  const handleInstantQrUpdate = async (row: ExperimentRowState) => {
    if (!row.qrShortId || !row.githubLink.trim()) return;
    updateRow(row.localId, { isUpdatingQr: true, qrUpdateSuccess: false });
    setError('');
    try {
      await updateDynamicQr(row.qrShortId, row.githubLink.trim());
      updateRow(row.localId, { isUpdatingQr: false, qrUpdateSuccess: true });
      setFeedbackMsg(`QR code ${row.qrShortId} destination updated live! Scans to printed sheets will redirect immediately.`);
      setTimeout(() => {
        updateRow(row.localId, { qrUpdateSuccess: false });
      }, 4000);
      setTimeout(() => {
        setFeedbackMsg('');
      }, 5000);
    } catch (err: unknown) {
      updateRow(row.localId, { isUpdatingQr: false });
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update dynamic QR link';
      setError(msg || 'Failed to update dynamic QR link');
    }
  };

  const syncExperiments = async (sid: string) => {
    const existing = id ? (await getSubject(sid)).experiments : [];
    const existingIds = new Set(rows.filter((r) => r._id || r.id).map((r) => (r._id || r.id)!));

    for (const exp of existing) {
      const expId = exp._id || exp.id;
      if (expId && !existingIds.has(expId)) {
        await deleteExperiment(expId);
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload = {
        experimentNo: i + 1,
        experimentName: row.experimentName.trim(),
        experimentDate: row.experimentDate || undefined,
        githubLink: row.githubLink.trim(),
      };
      const expId = row._id || row.id;
      if (expId) {
        await updateExperiment(expId, payload);
      } else {
        await createExperiment(sid, payload);
      }
    }
  };

  const handleGeneratePreview = async () => {
    setError('');
    setFeedbackMsg('');
    const valid = await form.trigger();
    if (!valid) return;

    for (let i = 0; i < rows.length; i++) {
      const rowData = { ...rows[i], experimentNo: i + 1 };
      const result = experimentRowSchema.safeParse(rowData);
      if (!result.success) {
        setError(`Row ${i + 1}: ${result.error.errors[0]?.message ?? 'Complete required fields'}`);
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
        sid = created._id || created.id;
        setSubjectId(sid);
      }

      if (sid) {
        await syncExperiments(sid);
        navigate(`/records/${sid}/preview`);
      }
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
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {id ? 'Edit lab record' : 'Create lab record'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Fill in your course details and experiments with dynamic QR codes.
        </p>
      </header>

      {feedbackMsg && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault();
          handleGeneratePreview();
        }}
      >
        {/* Course & Student Information Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Course &amp; Student Information
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enter your subject code, subject title, and student credentials.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subjectLine" className="text-xs font-medium text-foreground">
                Subject (Code &amp; Name)
              </Label>
              <Input
                id="subjectLine"
                placeholder="19MA220/SH2220 - Mathematics for Artificial Intelligence"
                className="h-10.5 rounded-xl border-border bg-background text-sm"
                {...form.register('subjectLine')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="studentName" className="text-xs font-medium text-foreground">
                  Student Name
                </Label>
                <Input
                  id="studentName"
                  placeholder="e.g. John Doe"
                  className="h-10.5 rounded-xl border-border bg-background text-sm"
                  {...form.register('studentName')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registerNumber" className="text-xs font-medium text-foreground">
                  Register Number
                </Label>
                <Input
                  id="registerNumber"
                  placeholder="e.g. 714021104001"
                  className="h-10.5 rounded-xl border-border bg-background text-sm font-mono"
                  {...form.register('registerNumber')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Experiments Section */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Experiments
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {rows.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Define your experiment titles, dates, and dynamic GitHub repository URLs.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="h-9 gap-1.5 rounded-xl border-border bg-card text-xs font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Experiment
            </Button>
          </div>

          <div className="space-y-3.5">
            {rows.map((row, index) => (
              <div
                key={row.localId}
                className="space-y-3 rounded-xl border border-border bg-background/50 p-4 transition-all hover:border-[#6351ce]/40 dark:hover:border-[#9d8df2]/40"
              >
                <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                  <div className="space-y-1 sm:col-span-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Exp #</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-9.5 rounded-lg border-border bg-card text-center font-mono text-xs"
                      value={row.experimentNo}
                      onChange={(e) =>
                        updateRow(row.localId, { experimentNo: Number(e.target.value) || index + 1 })
                      }
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-medium text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      className="h-9.5 rounded-lg border-border bg-card text-xs"
                      value={row.experimentDate}
                      onChange={(e) => updateRow(row.localId, { experimentDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <Label className="text-[11px] font-medium text-muted-foreground">
                      Experiment Title
                    </Label>
                    <Input
                      className="h-9.5 rounded-lg border-border bg-card text-xs"
                      placeholder="e.g. Matrix Inversion in Python"
                      value={row.experimentName}
                      onChange={(e) => updateRow(row.localId, { experimentName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-medium text-muted-foreground">
                        Target GitHub URL
                      </Label>
                      {row.qrShortId && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-secondary-foreground">
                          <QrCode className="h-3 w-3" />
                          /r/{row.qrShortId}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-9.5 rounded-lg border-border bg-card text-xs"
                        placeholder="https://github.com/user/repo"
                        value={row.githubLink}
                        onChange={(e) => updateRow(row.localId, { githubLink: e.target.value })}
                      />
                      {row.qrShortId && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9.5 shrink-0 rounded-lg px-2.5 text-xs"
                          title="Update dynamic QR destination immediately in real-time"
                          disabled={row.isUpdatingQr || !row.githubLink.trim()}
                          onClick={() => handleInstantQrUpdate(row)}
                        >
                          {row.isUpdatingQr ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : row.qrUpdateSuccess ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9.5 w-9.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeRow(row.localId)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {row.qrUpdateSuccess && (
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    Live dynamic QR destination synced! Printed physical QR codes now point to this new URL.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 sm:w-auto"
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating preview…
              </>
            ) : (
              'Generate Document Preview'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}