// Magic-link requests temporarily store signup metadata until the email link is used.
import mongoose from "mongoose";

const { Schema } = mongoose;

const magicLinkRequestSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    name: { type: String, default: "", trim: true },
    role: { type: String, enum: ["owner", "staff"], default: "owner", index: true },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// TTL cleanup keeps abandoned sign-up metadata from lingering forever.
magicLinkRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MagicLinkRequest =
  mongoose.models.MagicLinkRequest || mongoose.model("MagicLinkRequest", magicLinkRequestSchema, "magic_link_requests");

export default MagicLinkRequest;
