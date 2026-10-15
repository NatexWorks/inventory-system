import mongoose from "mongoose";

const { Schema } = mongoose;

const rateLimitSchema = new Schema(
  {
    // SHA-256 digest of a logical limiter key; raw emails and IP addresses are not stored.
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit = mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema, "rate_limits");

export default RateLimit;
