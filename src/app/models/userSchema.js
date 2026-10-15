// User schema stores account details and role-based access info.
import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    emailVerified: { type: Boolean, default: false, index: true },
    phone: { type: String, trim: true, default: "", maxlength: 30 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["owner", "staff"], default: "owner", index: true },
    isActive: { type: Boolean, default: true },
    // Public demo users must be isolated and prevented from mutating workspace data.
    isDemo: { type: Boolean, default: false, index: true },
    // Increment after password changes to revoke all older JWT sessions.
    tokenVersion: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

export default User;
