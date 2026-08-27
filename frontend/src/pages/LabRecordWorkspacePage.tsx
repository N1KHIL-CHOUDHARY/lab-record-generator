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

function newRow(): Omit<ExperimentRowState, 'experimentNo'> {
  return {
    localId: crypto.randomUUID(),
    experimentName: '',
    experimentDate: '',
    githubLink: '',
  };
}

export function LabRecordWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string | undefined>(id);
  const [rows, setRows] = useState<Omit<ExperimentRowState, 'experimentNo'>[]>([newRow()]);
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
    setRows((prev) => [...prev, newRow()]);
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
    const existingIds = new Set(rows.filter((r) => r._id).map((r) => r._id!));

    for (const exp of existing) {
      if (!existingIds.has(exp._id)) {
        await deleteExperiment(exp._id);
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
      if (row._id) {
        await updateExperiment(row._id, payload);
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
    <div className="mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <header className="mb-12">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {id ? 'Edit lab record' : 'New lab record'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure experiments with permanent dynamic QR codes. Changing target URLs updates physical QR codes instantly without re-printing.
        </p>
      </header>

      {feedbackMsg && (
        <div className="mb-8 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

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
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Experiments &amp; Dynamic QR Destinations
              </h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add row
            </Button>
          </div>

          <div className="space-y-4">
            {rows.map((row) => (
              <div
                key={row.localId}
                className="space-y-3 rounded-lg border border-border bg-card p-4 transition-colors"
              >
                <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">No.</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-10 border-border bg-background text-center font-mono"
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
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">Experiment Title</Label>
                    <Input
                      className="h-10 border-border bg-background"
                      placeholder="e.g. Matrix Inversion in Python"
                      value={row.experimentName}
                      onChange={(e) => updateRow(row.localId, { experimentName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Target Repository URL
                      </Label>
                      {row.qrShortId && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <QrCode className="h-3 w-3 text-primary" />
                          /r/{row.qrShortId}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        className="h-10 border-border bg-background text-xs"
                        placeholder="https://github.com/user/repo"
                        value={row.githubLink}
                        onChange={(e) => updateRow(row.localId, { githubLink: e.target.value })}
                      />
                      {row.qrShortId && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-10 shrink-0 px-2.5 text-xs"
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
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.localId)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {row.qrUpdateSuccess && (
                  <p className="text-xs text-emerald-500">
                    Live dynamic QR destination synced! Printed physical QR codes now point to this new URL.
                  </p>
                )}
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
              'Generate Document Preview'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}