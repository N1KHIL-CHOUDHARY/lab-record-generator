import mongoose, { Document, Schema } from 'mongoose';

export interface IQR extends Document {
  shortId: string;
  originalUrl: string;
  userId: Schema.Types.ObjectId;
  experimentId?: Schema.Types.ObjectId;
  totalScans: number;
  lastScannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const qrSchema = new Schema<IQR>(
  {
    shortId: { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    experimentId: { type: Schema.Types.ObjectId, ref: 'Experiment' },
    totalScans: { type: Number, default: 0 },
    lastScannedAt: { type: Date },
  },
  { timestamps: true }
);

export const QR = mongoose.model<IQR>('QR', qrSchema);
