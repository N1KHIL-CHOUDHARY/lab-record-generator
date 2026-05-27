import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISubject extends Document {
  userId: Types.ObjectId;
  subjectName: string;
  subjectCode: string;
  subjectCodeAlt?: string;
  studentName: string;
  registerNumber: string;
  semester?: string;
  facultyName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjectName: { type: String, required: true, trim: true },
    subjectCode: { type: String, required: true, trim: true },
    subjectCodeAlt: { type: String, trim: true },
    studentName: { type: String, trim: true, default: '' },
    registerNumber: { type: String, trim: true, default: '' },
    semester: { type: String, trim: true },
    facultyName: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Subject = mongoose.model<ISubject>('Subject', subjectSchema);
