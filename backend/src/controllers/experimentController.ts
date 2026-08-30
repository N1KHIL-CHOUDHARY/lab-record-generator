import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { createQRMapping, updateQRUrl } from '../services/qrService.js';
import { getStorageService } from '../services/storage/index.js';
import { normalizeGitHubUrl } from '../utils/githubValidator.js';

export const createExperiment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjectId = String(req.params.subjectId);
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId: req.userId! },
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const existing = await prisma.experiment.findFirst({
    where: {
      subjectId,
      experimentNo: req.body.experimentNo,
    },
  });

  if (existing) {
    throw new AppError('Experiment number already exists for this subject', 400);
  }

  const githubLink = normalizeGitHubUrl(req.body.githubLink);
  const count = await prisma.experiment.count({ where: { subjectId } });

  const storageService = getStorageService();
  let uploadedKey: string | null = null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create QR mapping participating in the ambient transaction
      const qrResult = await createQRMapping(githubLink, req.userId!, undefined, tx);
      uploadedKey = qrResult.qrImageFileName;

      // 2. Validate experiment number uniqueness inside transaction to prevent race conditions
      const duplicateInTx = await tx.experiment.findFirst({
        where: {
          subjectId,
          experimentNo: req.body.experimentNo,
        },
      });

      if (duplicateInTx) {
        throw new AppError('Experiment number already exists for this subject', 400);
      }

      // 3. Create experiment entry linked to the QR inside the same atomic transaction
      const experiment: any = await tx.experiment.create({
        data: {
          subjectId,
          userId: req.userId!,
          experimentNo: req.body.experimentNo,
          experimentName: req.body.experimentName,
          experimentDate: new Date(req.body.experimentDate || Date.now()),
          githubLink,
          qrId: qrResult.id,
          qrImage: qrResult.qrImage,
          order: count,
        },
        include: {
          qr: true,
        },
      });

      return { experiment, qrResult };
    });

    res.status(201).json({
      success: true,
      data: {
        ...result.experiment,
        _id: result.experiment.id,
        qrShortId: result.qrResult.shortCode,
        qrImage: result.qrResult.qrImage,
      },
    });
  } catch (err: any) {
    // If transaction fails, clean up uploaded cloud/storage asset to avoid orphaned storage leaks
    if (uploadedKey) {
      await storageService.delete(uploadedKey).catch((deleteErr) => {
        console.error(`Failed to cleanup orphaned storage asset ${uploadedKey}:`, deleteErr);
      });
    }
    throw err;
  }
});

export const updateExperiment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const experimentId = String(req.params.id);
  const experiment: any = await prisma.experiment.findFirst({
    where: {
      id: experimentId,
      userId: req.userId!,
    },
    include: {
      qr: true,
    },
  });

  if (!experiment) {
    throw new AppError('Experiment not found', 404);
  }

  let normalizedLink: string | undefined;
  if (req.body.githubLink) {
    normalizedLink = normalizeGitHubUrl(req.body.githubLink);
    if (experiment.qr?.shortCode) {
      await updateQRUrl(experiment.qr.shortCode, normalizedLink, req.userId!);
    } else if (experiment.qrId) {
      await prisma.qR.update({
        where: { id: experiment.qrId },
        data: { destinationUrl: normalizedLink },
      });
    }
  }

  if (req.body.experimentNo !== undefined && req.body.experimentNo !== experiment.experimentNo) {
    const dup = await prisma.experiment.findFirst({
      where: {
        subjectId: experiment.subjectId,
        experimentNo: req.body.experimentNo,
        id: { not: experiment.id },
      },
    });
    if (dup) throw new AppError('Experiment number already exists', 400);
  }

  const updated: any = await prisma.experiment.update({
    where: { id: experiment.id },
    data: {
      ...(normalizedLink ? { githubLink: normalizedLink } : {}),
      ...(req.body.experimentName ? { experimentName: req.body.experimentName } : {}),
      ...(req.body.experimentDate
        ? { experimentDate: new Date(req.body.experimentDate) }
        : {}),
      ...(req.body.experimentNo !== undefined
        ? { experimentNo: req.body.experimentNo }
        : {}),
    },
    include: {
      qr: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      ...updated,
      _id: updated.id,
      qrShortId: updated.qr?.shortCode || '',
    },
  });
});

export const deleteExperiment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const experimentId = String(req.params.id);
  const experiment: any = await prisma.experiment.findFirst({
    where: {
      id: experimentId,
      userId: req.userId!,
    },
    include: {
      qr: true,
    },
  });

  if (!experiment) {
    throw new AppError('Experiment not found', 404);
  }

  await prisma.experiment.delete({
    where: { id: experimentId },
  });

  if (experiment.qrId) {
    await prisma.qR
      .delete({ where: { id: experiment.qrId } })
      .catch(() => {});

    // Also clean up stored QR image
    if (experiment.qr?.shortCode) {
      const storageService = getStorageService();
      await storageService.delete(`qr/${experiment.qr.shortCode}.png`).catch(() => {});
    }
  }

  res.status(200).json({ success: true, message: 'Experiment deleted' });
});

export const reorderExperiments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjectId = String(req.params.subjectId);
  const { order } = req.body as { order: string[] };

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId: req.userId! },
  });
  if (!subject) throw new AppError('Subject not found', 404);

  await prisma.$transaction(
    order.map((id: string, index: number) =>
      prisma.experiment.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  const experiments: any[] = await prisma.experiment.findMany({
    where: { subjectId },
    include: { qr: true },
    orderBy: { order: 'asc' },
  });

  res.status(200).json({
    success: true,
    data: experiments.map((e: any) => ({
      ...e,
      _id: e.id,
      qrShortId: e.qr?.shortCode || '',
    })),
  });
});
