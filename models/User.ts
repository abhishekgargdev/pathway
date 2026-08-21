import { Schema, models, model, type Model } from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const User: Model<IUser> =
  models.User || model<IUser>("User", UserSchema);
