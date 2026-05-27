import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExperiment extends Document {
  subjectId: Types.ObjectId;
  userId: Types.ObjectId;
  experimentNo: number;
  experimentName: string;
  experimentDate: Date;
  githubLink: string;
  qrShortId: string;
  qrImage: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const experimentSchema = new Schema<IExperiment>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    experimentNo: { type: Number, required: true },
    experimentName: { type: String, required: true, trim: true },
    experimentDate: { type: Date, required: true },
    githubLink: { type: String, required: true },
    qrShortId: { type: String, required: true, unique: true },
    qrImage: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

experimentSchema.index({ subjectId: 1, experimentNo: 1 }, { unique: true });

export const Experiment = mongoose.model<IExperiment>('Experiment', experimentSchema);
