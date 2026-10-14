// Auth service handles signup, login, and password recovery flows.
import dbConnect from "../lib/db";
import User from "../models/userSchema";
import Settings from "../models/settingsSchema";
import PasswordReset from "../models/passwordResetSchema";
import { consumeEmailOtp, sendEmailOtp } from "./otpService";
import MagicLinkRequest from "../models/magicLinkRequestSchema";
import {
  authLoginSchema,
  signupWithOtpSchema,
  otpResetPasswordSchema,
  forgotPasswordSchema,
  magicLinkRequestSchema,
  resetPasswordSchema,
} from "../lib/validation";
import { comparePassword, createAuthPayload, hashPassword, signToken } from "../lib/security";
import crypto from "node:crypto";

export async function registerUser(input) {
  await dbConnect();
  const payload = signupWithOtpSchema.parse(input);

  const email = payload.email.toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    const error = new Error("Email already registered");
    error.status = 409;
    throw error;
  }

  // The same six-digit email code can create an account only once and only before expiry.
  await consumeEmailOtp({ email, otp: payload.otp, purpose: "signup" });

  const passwordHash = await hashPassword(payload.password);
  const user = await User.create({
    name: payload.name,
    email,
    passwordHash,
    // Public self-signup always creates an owner; staff accounts need an authorized flow.
    role: "owner",
    emailVerified: true,
  });

  await Settings.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { userId: user._id } },
    { upsert: true, returnDocument: "after" }
  );

  const token = signToken(createAuthPayload(user));

  return {
    user: user.toObject(),
    token,
  };
}

// Stores the role/name chosen on the sign-up form until the magic link is used.
export async function saveMagicLinkRequest(input) {
  await dbConnect();
  const payload = magicLinkRequestSchema.parse(input);
  const email = payload.email.toLowerCase();

  await MagicLinkRequest.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        name: payload.name || "",
        role: payload.role,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
        consumedAt: null,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return {
    email,
    role: payload.role,
  };
}

// Applies pending sign-up metadata to the app user record after the magic link is verified.
export async function consumeMagicLinkRequest(email, fallbackName = "") {
  await dbConnect();
  const normalizedEmail = String(email || "").toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const pending = await MagicLinkRequest.findOne({
    email: normalizedEmail,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });

  const existingUser = await User.findOne({ email: normalizedEmail });
  const resolvedName = pending?.name || existingUser?.name || fallbackName || normalizedEmail.split("@")[0];
  const resolvedRole = existingUser?.role || pending?.role || "owner";

  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        name: resolvedName,
        email: normalizedEmail,
        role: resolvedRole,
        isActive: true,
        emailVerified: true,
      },
      $setOnInsert: {
        passwordHash: crypto.randomBytes(32).toString("hex"),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  if (pending) {
    pending.consumedAt = new Date();
    await pending.save();
  }

  return user;
}

class UnauthorizedError extends Error{
  status=401;
}
export async function loginUser(input) {
  await dbConnect();
  const payload = authLoginSchema.parse(input);
  const email = payload.email.toLowerCase();

  const user = await User.findOne({ email, isActive: true });
  if (!user) {
    // Error
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await comparePassword(payload.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const token = signToken(createAuthPayload(user));

  return {
    user: user.toObject(),
    token,
  };
}

export async function requestPasswordReset(input) {
  const payload = forgotPasswordSchema.parse(input);
  const email = payload.email.toLowerCase();

  // sendEmailOtp intentionally returns the same public result for unknown accounts.
  return sendEmailOtp({ email, purpose: "password-reset" });
}

export async function resetPassword(input) {
  await dbConnect();

  // Keep already-issued legacy reset links valid until they expire, but all new
  // recovery requests use the emailed six-digit code.
  if (typeof input?.token === "string" && input.token.trim()) {
    const payload = resetPasswordSchema.parse(input);
    const tokenHash = crypto.createHash("sha256").update(payload.token).digest("hex");
    const resetRecord = await PasswordReset.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      throw new Error("Reset token is invalid or expired");
    }

    const user = await User.findById(resetRecord.userId);
    if (!user || !user.isActive) {
      throw new Error("User not found");
    }

    user.passwordHash = await hashPassword(payload.password);
    await user.save();

    resetRecord.usedAt = new Date();
    await resetRecord.save();

    return { user: user.toObject() };
  }

  const payload = otpResetPasswordSchema.parse(input);
  const email = payload.email.toLowerCase();

  await consumeEmailOtp({ email, otp: payload.otp, purpose: "password-reset" });

  const user = await User.findOne({ email, isActive: true });
  if (!user) {
    // Return the same non-specific error even if an account changed after OTP issuance.
    throw new Error("The verification code is invalid or expired.");
  }

  user.passwordHash = await hashPassword(payload.password);
  await user.save();

  // Invalidate older links as well as any lingering OTPs for this address.
  await PasswordReset.updateMany(
    { email, usedAt: null },
    { $set: { usedAt: new Date() } }
  );

  return { user: user.toObject() };
}

export async function getUserById(userId) {
  await dbConnect();
  return User.findById(userId).select("-passwordHash");
}
