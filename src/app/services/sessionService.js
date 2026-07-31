// Session service powers QR/session-based billing workflows.
import crypto from "node:crypto";
import QRCode from "qrcode";
import dbConnect from "../lib/db";
import Session from "../models/sessionSchema";
import { SESSION_STATES, assertSessionTransition } from "../lib/stateMachine";
import { reserveBarcode } from "./barcodeService";
import { getProductById } from "./productService";

export async function createSession(userId, ownerId, input = {}) {
  await dbConnect();
  const sessionId = crypto.randomUUID();
  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/sessions/${sessionId}`;
  const qrCode = await QRCode.toDataURL(joinUrl || sessionId);

  const session = await Session.create({
    userId,
    ownerId,
    sessionId,
    name: input.name || "Billing Session",
    qrCode,
    status: SESSION_STATES.ACTIVE,
    deviceIds: input.deviceId ? [input.deviceId] : [],
    expiresAt: input.expiresAt || null,
  });

  return session;
}

export async function getSessionBySessionId(userId, sessionId) {
  await dbConnect();
  return Session.findOne({ userId, sessionId });
}

export async function joinSession(userId, sessionId, deviceId) {
  const session = await getSessionBySessionId(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status !== SESSION_STATES.ACTIVE) {
    throw new Error("Session is not active");
  }

  if (deviceId && !session.deviceIds.includes(deviceId)) {
    session.deviceIds.push(deviceId);
  }

  await session.save();
  return session;
}

export async function addBarcodeToSessionCart(userId, sessionId, barcode, productId) {
  const session = await getSessionBySessionId(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status !== SESSION_STATES.ACTIVE) {
    throw new Error("Session is not active");
  }

  const product = productId ? await getProductById(userId, productId) : null;
  if (!product) {
    throw new Error("Product not found for barcode");
  }

  const reserved = await reserveBarcode(userId, barcode, session._id);
  const existingIndex = session.cartItems.findIndex((item) => item.barcode === barcode);
  const lineTotal = Number(product.price || 0);

  if (existingIndex >= 0) {
    session.cartItems[existingIndex].quantity += 1;
    session.cartItems[existingIndex].lineTotal += lineTotal;
  } else {
    session.cartItems.push({
      productId: product._id,
      barcodeId: reserved._id,
      code: barcode,
      name: product.name,
      price: Number(product.price || 0),
      quantity: 1,
      lineTotal,
    });
  }

  await session.save();
  return session;
}

export async function completeSession(userId, sessionId) {
  const session = await getSessionBySessionId(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  assertSessionTransition(session.status, SESSION_STATES.COMPLETED);
  session.status = SESSION_STATES.COMPLETED;
  session.completedAt = new Date();
  await session.save();
  return session;
}

export async function cancelSession(userId, sessionId) {
  const session = await getSessionBySessionId(userId, sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  assertSessionTransition(session.status, SESSION_STATES.CANCELLED);
  session.status = SESSION_STATES.CANCELLED;
  session.cancelledAt = new Date();
  await session.save();
  return session;
}
