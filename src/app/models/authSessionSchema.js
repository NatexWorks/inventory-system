// Auth session records back opaque, browser-persistent session IDs.
// Only a SHA-256 hash of the secret ID is stored in MongoDB.
import mongoose from "mongoose";

const { Schema } = mongoose;

const authSessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    // Password reset/change increments the user's tokenVersion and invalidates old sessions.
    tokenVersion: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "auth_sessions" }
);

// MongoDB removes expired records asynchronously; every auth check also enforces expiresAt.
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthSession = mongoose.models.AuthSession || mongoose.model("AuthSession", authSessionSchema);

export default AuthSession;
