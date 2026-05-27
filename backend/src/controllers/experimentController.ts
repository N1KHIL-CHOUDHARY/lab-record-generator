import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { Subject } from '../models/Subject.js';
import { Experiment } from '../models/Experiment.js';
import { AppError } from '../utils/AppError.js';
import { createQRMapping, updateQRUrl } from '../services/qrService.js';
import { normalizeGitHubUrl } from '../utils/githubValidator.js';

export const createExperiment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subjectId } = req.params;
  const subject = await Subject.findOne({ _id: subjectId, userId: req.userId });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const existing = await Experiment.findOne({
    subjectId,
    experimentNo: req.body.experimentNo,
  });

  if (existing) {
    throw new AppError('Experiment number already exists for this subject', 400);
  }

  const githubLink = normalizeGitHubUrl(req.body.githubLink);
  const count = await Experiment.countDocuments({ subjectId });

  const { shortId, qrImage } = await createQRMapping(
    githubLink,
    subject.userId,
    undefined
  );

  const experiment = await Experiment.create({
    subjectId,
    userId: req.userId,
    experimentNo: req.body.experimentNo,
    experimentName: req.body.experimentName,
    experimentDate: new Date(req.body.experimentDate),
    githubLink,
    qrShortId: shortId,
    qrImage,
    order: count,
  });

  const { QR } = await import('../models/QR.js');
  await QR.findOneAndUpdate({ shortId }, { experimentId: experiment._id });

  res.status(201).json({ success: true, data: experiment });
});

export const updateExperiment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const experiment = await Experiment.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!experiment) {
    throw new AppError('Experiment not found', 404);
  }

  if (req.body.githubLink) {
    const githubLink = normalizeGitHubUrl(req.body.githubLink);
    experiment.githubLink = githubLink;
    await updateQRUrl(experiment.qrShortId, githubLink, req.userId!);
  }

  if (req.body.experimentName) experiment.experimentName = req.body.experimentName;
  if (req.body.experimentDate) experiment.experimentDate = new Date(req.body.experimentDate);
  if (req.body.experimentNo !== undefined) {
    const dup = await Experiment.findOne({
      subjectId: experiment.subjectId,
      experimentNo: req.body.experimentNo,
      _id: { $ne: experiment._id },
    });
    if (dup) throw new AppError('Experiment number already exists', 400);
    experiment.experimentNo = req.body.experimentNo;
  }

  await experiment.save();

  res.status(200).json({ success: true, data: experiment });
});

export const deleteExperiment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const experiment = await Experiment.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!experiment) {
    throw new AppError('Experiment not found', 404);
  }

  res.status(200).json({ success: true, message: 'Experiment deleted' });
});

export const reorderExperiments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { subjectId } = req.params;
  const { order } = req.body as { order: string[] };

  const subject = await Subject.findOne({ _id: subjectId, userId: req.userId });
  if (!subject) throw new AppError('Subject not found', 404);

  await Promise.all(
    order.map((id, index) =>
      Experiment.updateOne({ _id: id, subjectId }, { order: index })
    )
  );

  const experiments = await Experiment.find({ subjectId }).sort({ order: 1 });

  res.status(200).json({ success: true, data: experiments });
});
