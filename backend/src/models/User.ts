import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  avatar?: string;
  firebaseUid: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String },
    firebaseUid: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
