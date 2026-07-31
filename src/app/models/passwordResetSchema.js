// Password reset schema stores short-lived recovery tokens.
import mongoose from "mongoose";

const { Schema } = mongoose;

const passwordResetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passwordResetSchema.index({ email: 1, usedAt: 1, expiresAt: 1 });

const PasswordReset = mongoose.models.PasswordReset || mongoose.model("PasswordReset", passwordResetSchema, "password_resets");

export default PasswordReset;
