import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { Subject } from '../models/Subject.js';
import { Experiment } from '../models/Experiment.js';
import { AppError } from '../utils/AppError.js';

export const createSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.create({
    ...req.body,
    userId: req.userId,
  });

  res.status(201).json({ success: true, data: subject });
});

export const getSubjects = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subjects = await Subject.find({ userId: req.userId }).sort({ updatedAt: -1 });

  const subjectsWithCount = await Promise.all(
    subjects.map(async (s) => {
      const count = await Experiment.countDocuments({ subjectId: s._id });
      return { ...s.toObject(), experimentCount: count };
    })
  );

  res.status(200).json({ success: true, data: subjectsWithCount });
});

export const getSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.findOne({ _id: req.params.id, userId: req.userId });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  const experiments = await Experiment.find({ subjectId: subject._id }).sort({
    order: 1,
    experimentNo: 1,
  });

  res.status(200).json({
    success: true,
    data: { subject, experiments },
  });
});

export const updateSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  res.status(200).json({ success: true, data: subject });
});

export const deleteSubject = asyncHandler(async (req: AuthRequest, res: Response) => {
  const subject = await Subject.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!subject) {
    throw new AppError('Subject not found', 404);
  }

  await Experiment.deleteMany({ subjectId: subject._id });

  res.status(200).json({ success: true, message: 'Subject deleted' });
});
