import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRecordExperiment {
  experimentNo: number;
  experimentName: string;
  experimentDate: Date;
  githubLink: string;
  qrShortId: string;
  qrImage: string;
}

export interface IRecord extends Document {
  userId: Types.ObjectId;
  subjectId: Types.ObjectId;
  subjectName: string;
  subjectCode: string;
  subjectCodeAlt?: string;
  studentName: string;
  registerNumber: string;
  experiments: IRecordExperiment[];
  pdfUrl?: string;
  docxUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recordExperimentSchema = new Schema<IRecordExperiment>(
  {
    experimentNo: { type: Number, required: true },
    experimentName: { type: String, required: true },
    experimentDate: { type: Date, required: true },
    githubLink: { type: String, required: true },
    qrShortId: { type: String, required: true },
    qrImage: { type: String, required: true },
  },
  { _id: false }
);

const recordSchema = new Schema<IRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true },
    subjectCodeAlt: { type: String },
    studentName: { type: String, default: '' },
    registerNumber: { type: String, default: '' },
    experiments: { type: [recordExperimentSchema], required: true },
    pdfUrl: { type: String },
    docxUrl: { type: String },
  },
  { timestamps: true }
);

recordSchema.index({ userId: 1, createdAt: -1 });

export const Record = mongoose.model<IRecord>('Record', recordSchema);
