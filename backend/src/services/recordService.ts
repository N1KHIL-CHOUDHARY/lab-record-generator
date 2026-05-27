import { Types } from 'mongoose';
import { Record } from '../models/Record.js';
import { Subject } from '../models/Subject.js';
import { Experiment } from '../models/Experiment.js';
import { AppError } from '../utils/AppError.js';
import { exportDocx, exportPdf, ExportData } from './exportService.js';
import { env } from '../config/env.js';

const MAX_RECORDS_PER_USER = 10;

async function trimRecordHistory(userId: string): Promise<void> {
  const records = await Record.find({ userId })
    .sort({ createdAt: -1 })
    .select('_id');

  if (records.length > MAX_RECORDS_PER_USER) {
    const toDelete = records.slice(MAX_RECORDS_PER_USER).map((r) => r._id);
    await Record.deleteMany({ _id: { $in: toDelete } });
  }
}

function buildExportData(subject: InstanceType<typeof Subject>, experiments: InstanceType<typeof Experiment>[]): ExportData {
  return {
    subjectCode: subject.subjectCode,
    subjectCodeAlt: subject.subjectCodeAlt,
    subjectName: subject.subjectName,
    studentName: subject.studentName || '',
    registerNumber: subject.registerNumber || '',
    experiments: experiments.map((e) => ({
      experimentNo: e.experimentNo,
      experimentName: e.experimentName,
      experimentDate: e.experimentDate,
      githubLink: e.githubLink,
      qrImage: e.qrImage,
    })),
  };
}

export async function generateRecord(userId: string, subjectId: string) {
  const subject = await Subject.findOne({ _id: subjectId, userId });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const experiments = await Experiment.find({ subjectId, userId }).sort({
    order: 1,
    experimentNo: 1,
  });

  if (experiments.length === 0) {
    throw new AppError('Add at least one experiment before generating a record', 400);
  }

  const exportData = buildExportData(subject, experiments);

  const recordId = new Types.ObjectId();
  const baseFileName = `record-${recordId.toString()}`;

  const [docxUrl, pdfUrl] = await Promise.all([
    exportDocx(exportData, baseFileName),
    exportPdf(exportData, baseFileName),
  ]);

  const record = await Record.create({
    _id: recordId,
    userId,
    subjectId: subject._id,
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    subjectCodeAlt: subject.subjectCodeAlt,
    studentName: subject.studentName || '',
    registerNumber: subject.registerNumber || '',
    experiments: experiments.map((e) => ({
      experimentNo: e.experimentNo,
      experimentName: e.experimentName,
      experimentDate: e.experimentDate,
      githubLink: e.githubLink,
      qrShortId: e.qrShortId,
      qrImage: e.qrImage,
    })),
    docxUrl: `${env.appUrl}${docxUrl}`,
    pdfUrl: `${env.appUrl}${pdfUrl}`,
  });

  await trimRecordHistory(userId);

  return record;
}

export async function getPreviewHtml(userId: string, subjectId: string): Promise<string> {
  const subject = await Subject.findOne({ _id: subjectId, userId });
  if (!subject) throw new AppError('Subject not found', 404);

  const experiments = await Experiment.find({ subjectId, userId }).sort({
    order: 1,
    experimentNo: 1,
  });

  const { buildLabRecordHtml } = await import('../templates/labRecordHtml.js');
  return buildLabRecordHtml(buildExportData(subject, experiments));
}

export async function getHistory(userId: string) {
  return Record.find({ userId }).sort({ createdAt: -1 }).limit(10);
}

export async function deleteHistoryRecord(userId: string, recordId: string) {
  const record = await Record.findOneAndDelete({ _id: recordId, userId });

  if (!record) {
    throw new AppError('Record not found', 404);
  }

  return record;
}

export async function getDashboardStats(userId: string) {
  const [totalRecords, subjects, recentRecords, experiments] = await Promise.all([
    Record.countDocuments({ userId }),
    Subject.find({ userId }).sort({ updatedAt: -1 }).limit(5),
    Record.findOne({ userId }).sort({ createdAt: -1 }),
    Experiment.find({ userId }).select('qrShortId'),
  ]);

  const { getQRAnalytics } = await import('./qrService.js');
  const qrAnalytics = await getQRAnalytics(userId);

  return {
    totalRecords,
    totalSubjects: await Subject.countDocuments({ userId }),
    totalExperiments: experiments.length,
    recentSubjects: subjects,
    lastRecord: recentRecords,
    qrScans: qrAnalytics.totalScans,
    qrAnalytics: qrAnalytics.topLinks,
  };
}
