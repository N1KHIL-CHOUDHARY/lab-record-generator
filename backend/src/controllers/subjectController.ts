import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export const createSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject: any = await prisma.subject.create({
    data: {
      ...req.body,
      userId: req.userId!,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      ...subject,
      _id: subject.id,
    },
  });
});

export const getSubjects = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjects: any[] = await prisma.subject.findMany({
    where: { userId: req.userId! },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { experiments: true },
      },
    },
  });

  const subjectsWithCount = subjects.map((s: any) => ({
    ...s,
    _id: s.id,
    experimentCount: s._count?.experiments || 0,
  }));

  res.status(200).json({ success: true, data: subjectsWithCount });
});

export const getSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjectId = String(req.params.id);
  const subject: any = await prisma.subject.findFirst({
    where: { id: subjectId, userId: req.userId! },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const experiments: any[] = await prisma.experiment.findMany({
    where: { subjectId: subject.id },
    include: { qr: true },
    orderBy: [{ order: 'asc' }, { experimentNo: 'asc' }],
  });

  res.status(200).json({
    success: true,
    data: {
      subject: {
        ...subject,
        _id: subject.id,
      },
      experiments: experiments.map((e: any) => ({
        ...e,
        _id: e.id,
        qrShortId: e.qr?.shortCode || '',
      })),
    },
  });
});

export const updateSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjectId = String(req.params.id);
  const subject: any = await prisma.subject.findFirst({
    where: { id: subjectId, userId: req.userId! },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const updated: any = await prisma.subject.update({
    where: { id: subjectId },
    data: req.body,
  });

  res.status(200).json({
    success: true,
    data: {
      ...updated,
      _id: updated.id,
    },
  });
});

export const deleteSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjectId = String(req.params.id);
  const subject: any = await prisma.subject.findFirst({
    where: { id: subjectId, userId: req.userId! },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  await prisma.subject.delete({
    where: { id: subjectId },
  });

  res.status(200).json({ success: true, message: 'Subject deleted' });
});
