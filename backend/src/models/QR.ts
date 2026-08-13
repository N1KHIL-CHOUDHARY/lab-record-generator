import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IQR extends Document {
  shortId: string;
  targetUrl: string;
  createdBy: Types.ObjectId;
  userId?: Types.ObjectId;
  originalUrl?: string;
  experimentId?: Types.ObjectId;
  totalScans: number;
  lastScannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const qrSchema = new Schema<IQR>(
  {
    shortId: { type: String, required: true, unique: true, index: true },
    targetUrl: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    experimentId: { type: Schema.Types.ObjectId, ref: 'Experiment' },
    totalScans: { type: Number, default: 0 },
    lastScannedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backwards compatibility virtuals
qrSchema.virtual('originalUrl').get(function (this: IQR) {
  return this.targetUrl;
}).set(function (this: IQR, value: string) {
  this.targetUrl = value;
});

qrSchema.virtual('userId').get(function (this: IQR) {
  return this.createdBy;
}).set(function (this: IQR, value: Types.ObjectId) {
  this.createdBy = value;
});

export const QR = mongoose.model<IQR>('QR', qrSchema);
