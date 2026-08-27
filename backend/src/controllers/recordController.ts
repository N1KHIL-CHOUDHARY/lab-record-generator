import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  generateRecord,
  getHistory,
  deleteHistoryRecord,
  getDashboardStats,
  getPreviewHtml,
  getRecordPdfBuffer,
  getSubjectPdfBuffer,
} from '../services/recordService.js';

export const createRecord = asyncHandler(async (req: AuthRequest, res: Response) => {
  const record = await generateRecord(req.userId!, req.body.subjectId);
  res.status(201).json({ success: true, data: record });
});

export const getRecordPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
  const recordId = String(req.params.id);
  const buffer = await getRecordPdfBuffer(req.userId!, recordId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="lab-record-${recordId}.pdf"`);
  res.setHeader('Content-Length', buffer.length);
  res.status(200).end(buffer);
});

export const getSubjectPdfPreview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjectId = String(req.params.subjectId);
  const buffer = await getSubjectPdfBuffer(req.userId!, subjectId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="preview-${subjectId}.pdf"`);
  res.setHeader('Content-Length', buffer.length);
  res.status(200).end(buffer);
});

export const getRecordHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const history = await getHistory(req.userId!);
  res.status(200).json({ success: true, data: history });
});

export const deleteRecord = asyncHandler(async (req: AuthRequest, res: Response) => {
  await deleteHistoryRecord(req.userId!, String(req.params.id));
  res.status(200).json({ success: true, message: 'Record deleted' });
});

export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await getDashboardStats(req.userId!);
  res.status(200).json({ success: true, data: stats });
});

export const previewRecord = asyncHandler(async (req: AuthRequest, res: Response) => {
  const html = await getPreviewHtml(req.userId!, String(req.params.subjectId));
  res.type('html').send(html);
});
