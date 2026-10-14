import crypto from "node:crypto";
import dbConnect from "../lib/db";
import EmailOtp from "../models/emailOtpSchema";
import User from "../models/userSchema";
import { sendOtpEmail } from "../lib/emailService";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function serviceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getOtpPepper() {
  const pepper = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!pepper || pepper.length < 32) {
    throw new Error("Set OTP_SECRET or JWT_SECRET to a random server-only secret of at least 32 characters.");
  }
  return pepper;
}

function hashOtp(email, purpose, otp) {
  return crypto
    .createHmac("sha256", getOtpPepper())
    .update(`${email.toLowerCase()}:${purpose}:${otp}`)
    .digest("hex");
}

function canExposeDevelopmentOtp() {
  return process.env.NODE_ENV !== "production" && process.env.OTP_DEV_RETURN_CODE === "true";
}

export async function sendEmailOtp({ email: rawEmail, purpose, name = "" }) {
  await dbConnect();

  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || !["signup", "password-reset"].includes(purpose)) {
    throw serviceError("A valid email and OTP purpose are required.", 400);
  }

  const isSignup = purpose === "signup";
  const account = await User.findOne({ email, ...(isSignup ? {} : { isActive: true }) }).select("_id name").lean();

  if (isSignup && account) {
    throw serviceError("Email already registered. Please log in instead.", 409);
  }

  // Reset requests always receive the same public response to prevent account enumeration.
  if (!isSignup && !account) {
    return { ok: true, developmentOtp: null };
  }

  const now = new Date();
  const existing = await EmailOtp.findOne({ email, purpose }).lean();
  const lastSentAt = existing?.lastSentAt ? new Date(existing.lastSentAt) : null;

  if (lastSentAt && now.getTime() - lastSentAt.getTime() < RESEND_WAIT_MS) {
    throw serviceError("Please wait 60 seconds before requesting another code.", 429);
  }

  const windowStartedAt = existing?.windowStartedAt ? new Date(existing.windowStartedAt) : null;
  const resetWindow = !windowStartedAt || now.getTime() - windowStartedAt.getTime() >= SEND_WINDOW_MS;
  const sendCount = resetWindow ? 0 : Number(existing?.sendCount || 0);

  if (sendCount >= MAX_SENDS_PER_WINDOW) {
    throw serviceError("Too many codes requested. Please try again in 15 minutes.", 429);
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const windowStart = resetWindow ? now : windowStartedAt;
  const saved = await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        email,
        purpose,
        codeHash: hashOtp(email, purpose, otp),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        deleteAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        attempts: 0,
        consumedAt: null,
        lastSentAt: now,
        windowStartedAt: windowStart,
        sendCount: sendCount + 1,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  try {
    if (canExposeDevelopmentOtp()) {
      // Explicit local-only test mode: don't send test emails to real SMTP inboxes.
      return { ok: true, developmentOtp: otp };
    }

    await sendOtpEmail({
      to: email,
      name: name || account?.name || "",
      otp,
      purpose,
    });

    return { ok: true };
  } catch (error) {
    // Invalidate a code that was not successfully delivered.
    await EmailOtp.updateOne({ _id: saved._id, consumedAt: null }, { $set: { consumedAt: new Date() } });
    throw error;
  }
}

export async function consumeEmailOtp({ email: rawEmail, otp: rawOtp, purpose }) {
  await dbConnect();

  const email = String(rawEmail || "").trim().toLowerCase();
  const otp = String(rawOtp || "").trim();
  if (!/^\d{6}$/.test(otp) || !["signup", "password-reset"].includes(purpose)) {
    throw serviceError("The verification code is invalid or expired.", 400);
  }

  const now = new Date();
  const record = await EmailOtp.findOne({
    email,
    purpose,
    consumedAt: null,
    expiresAt: { $gt: now },
  });

  if (!record) {
    throw serviceError("The verification code is invalid or expired.", 400);
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw serviceError("Too many incorrect codes. Request a new code.", 429);
  }

  const expectedHash = hashOtp(email, purpose, otp);
  const correct = crypto.timingSafeEqual(
    Buffer.from(record.codeHash, "hex"),
    Buffer.from(expectedHash, "hex")
  );

  if (!correct) {
    await EmailOtp.updateOne(
      { _id: record._id, consumedAt: null, attempts: { $lt: MAX_VERIFY_ATTEMPTS } },
      { $inc: { attempts: 1 } }
    );
    throw serviceError("The verification code is invalid or expired.", 400);
  }

  const consumed = await EmailOtp.findOneAndUpdate(
    {
      _id: record._id,
      codeHash: expectedHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_VERIFY_ATTEMPTS },
    },
    { $set: { consumedAt: new Date() } },
    { new: true }
  );

  if (!consumed) {
    throw serviceError("The verification code is invalid, expired, or already used.", 400);
  }

  return true;
}
