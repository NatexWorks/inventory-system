import mongoose from "mongoose";

const { Schema } = mongoose;

const emailOtpSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    purpose: { type: String, required: true, enum: ["signup", "password-reset"] },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    // Keep delivery metadata slightly longer than the OTP itself so resend limits persist.
    deleteAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    consumedAt: { type: Date, default: null },
    lastSentAt: { type: Date, required: true },
    windowStartedAt: { type: Date, required: true },
    sendCount: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

const EmailOtp = mongoose.models.EmailOtp || mongoose.model("EmailOtp", emailOtpSchema, "email_otps");

export default EmailOtp;
