import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { exportDocx, exportPdf, generatePdfBuffer, ExportData } from './exportService.js';
import { getQRAnalytics } from './qrService.js';

const MAX_RECORDS_PER_USER = 10;

async function trimRecordHistory(userId: string): Promise<void> {
  const records = await prisma.record.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (records.length > MAX_RECORDS_PER_USER) {
    const toDelete = records.slice(MAX_RECORDS_PER_USER).map((r: { id: string }) => r.id);
    await prisma.record.deleteMany({
      where: { id: { in: toDelete } },
    });
  }
}

function buildExportData(
  subject: {
    subjectCode: string;
    subjectCodeAlt: string | null;
    subjectName: string;
    studentName: string;
    registerNumber: string;
  },
  experiments: Array<{
    experimentNo: number;
    experimentName: string;
    experimentDate: Date;
    githubLink: string;
    qrImage?: string | null;
    qr?: { shortCode: string; destinationUrl: string } | null;
    qrShortId?: string;
  }>
): ExportData {
  return {
    subjectCode: subject.subjectCode,
    subjectCodeAlt: subject.subjectCodeAlt || undefined,
    subjectName: subject.subjectName,
    studentName: subject.studentName || '',
    registerNumber: subject.registerNumber || '',
    experiments: experiments.map((e) => {
      const shortCode = e.qr?.shortCode || e.qrShortId;
      return {
        experimentNo: e.experimentNo,
        experimentName: e.experimentName,
        experimentDate: e.experimentDate,
        githubLink: e.qr?.destinationUrl || e.githubLink,
        qrShortId: shortCode,
        qrImage: e.qrImage || undefined,
      };
    }),
  };
}

export async function generateRecord(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const experiments: any[] = await prisma.experiment.findMany({
    where: { subjectId, userId },
    include: { qr: true },
    orderBy: [{ order: 'asc' }, { experimentNo: 'asc' }],
  });

  if (experiments.length === 0) {
    throw new AppError('Add at least one experiment before generating a record', 400);
  }

  const exportData = buildExportData(subject, experiments);
  const baseFileName = `record-${subjectId}-${Date.now()}`;

  const [docxUrl, pdfUrl] = await Promise.all([
    exportDocx(exportData, baseFileName),
    exportPdf(exportData, baseFileName),
  ]);

  const experimentsSnapshot = experiments.map((e: any) => ({
    _id: e.id,
    id: e.id,
    experimentNo: e.experimentNo,
    experimentName: e.experimentName,
    experimentDate: e.experimentDate instanceof Date ? e.experimentDate.toISOString() : String(e.experimentDate),
    githubLink: e.qr?.destinationUrl || e.githubLink,
    qrShortId: e.qr?.shortCode || '',
    qrImage: e.qrImage || '',
  }));

  const record = await prisma.record.create({
    data: {
      userId,
      subjectId: subject.id,
      subjectName: subject.subjectName,
      subjectCode: subject.subjectCode,
      subjectCodeAlt: subject.subjectCodeAlt,
      studentName: subject.studentName || '',
      registerNumber: subject.registerNumber || '',
      experiments: experimentsSnapshot,
      docxUrl,
      pdfUrl,
    },
  });

  await trimRecordHistory(userId);

  return {
    ...record,
    _id: record.id,
    experiments: experimentsSnapshot,
  };
}

export async function getRecordPdfBuffer(userId: string, recordId: string): Promise<Buffer> {
  const record = await prisma.record.findFirst({
    where: { id: recordId, userId },
  });

  if (!record) {
    throw new AppError('Record not found', 404);
  }

  const rawExperiments = (record.experiments as any[]) || [];
  const exportData: ExportData = {
    subjectCode: record.subjectCode,
    subjectCodeAlt: record.subjectCodeAlt || undefined,
    subjectName: record.subjectName,
    studentName: record.studentName || '',
    registerNumber: record.registerNumber || '',
    experiments: rawExperiments.map((e: any) => ({
      experimentNo: e.experimentNo,
      experimentName: e.experimentName,
      experimentDate: e.experimentDate,
      githubLink: e.githubLink,
      qrShortId: e.qrShortId,
      qrImage: e.qrImage,
    })),
  };

  return generatePdfBuffer(exportData);
}

export async function getSubjectPdfBuffer(userId: string, subjectId: string): Promise<Buffer> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const experiments = await prisma.experiment.findMany({
    where: { subjectId, userId },
    include: { qr: true },
    orderBy: [{ order: 'asc' }, { experimentNo: 'asc' }],
  });

  if (experiments.length === 0) {
    throw new AppError('Add at least one experiment before generating a record', 400);
  }

  const exportData = buildExportData(subject, experiments);
  return generatePdfBuffer(exportData);
}

export async function getPreviewHtml(userId: string, subjectId: string): Promise<string> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
  });
  if (!subject) throw new AppError('Subject not found', 404);

  const experiments = await prisma.experiment.findMany({
    where: { subjectId, userId },
    include: { qr: true },
    orderBy: [{ order: 'asc' }, { experimentNo: 'asc' }],
  });

  const { buildLabRecordHtml } = await import('../templates/labRecordHtml.js');
  return buildLabRecordHtml(buildExportData(subject, experiments));
}

export async function getHistory(userId: string) {
  const records = await prisma.record.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return records.map((r: any) => ({
    ...r,
    _id: r.id,
    experiments: (r.experiments as any[]) || [],
  }));
}

export async function deleteHistoryRecord(userId: string, recordId: string) {
  const record = await prisma.record.findFirst({
    where: { id: recordId, userId },
  });

  if (!record) {
    throw new AppError('Record not found', 404);
  }

  await prisma.record.delete({
    where: { id: recordId },
  });

  return {
    ...record,
    _id: record.id,
  };
}

export async function getDashboardStats(userId: string) {
  const [totalRecords, totalSubjects, totalExperiments, subjects, recentRecord] =
    await Promise.all([
      prisma.record.count({ where: { userId } }),
      prisma.subject.count({ where: { userId } }),
      prisma.experiment.count({ where: { userId } }),
      prisma.subject.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          _count: {
            select: { experiments: true },
          },
        },
      }),
      prisma.record.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  const qrAnalytics = await getQRAnalytics(userId);

  return {
    totalRecords,
    totalSubjects,
    totalExperiments,
    recentSubjects: subjects.map((s: any) => ({
      ...s,
      _id: s.id,
      experimentCount: s._count?.experiments || 0,
    })),
    lastRecord: recentRecord
      ? {
          ...recentRecord,
          _id: recentRecord.id,
          experiments: (recentRecord.experiments as any[]) || [],
        }
      : null,
    qrScans: qrAnalytics.totalScans,
    qrAnalytics: qrAnalytics.topLinks,
  };
}
