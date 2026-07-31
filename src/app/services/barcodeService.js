// Barcode service manages reservation and state changes for barcodes.
import dbConnect from "../lib/db";
import Barcode from "../models/barcodeSchema";
import Product from "../models/productSchema";
import { BARCODE_STATES, assertBarcodeTransition } from "../lib/stateMachine";

export async function ensureBarcode(userId, productId, code) {
  await dbConnect();

  return Barcode.findOneAndUpdate(
    { userId, code },
    {
      $setOnInsert: {
        userId,
        productId,
        code,
        state: BARCODE_STATES.AVAILABLE,
      },
    },
    { upsert: true, returnDocument:"after" }
  );
}

export async function getBarcodeByCode(userId, code) {
  await dbConnect();
  return Barcode.findOne({ userId, code });
}

async function removeBarcodeFromProductCache(userId, productId, code, mongoSession = null) {
  if (!productId) {
    return;
  }

  await Product.updateOne(
    { _id: productId, userId },
    {
      $pull: {
        barcodes: { code },
      },
    },
    mongoSession ? { session: mongoSession } : undefined
  );
}

async function addBarcodeBackToProductCache(userId, productId, code, mongoSession = null) {
  if (!productId) {
    return;
  }

  await Product.updateOne(
    { _id: productId, userId, "barcodes.code": { $ne: code } },
    {
      $push: {
        barcodes: {
          code,
          state: BARCODE_STATES.AVAILABLE,
          barcodeId: null,
        },
      },
    },
    mongoSession ? { session: mongoSession } : undefined
  );
}

async function saveBarcodeState(barcode, nextState, { sessionId = null, orderId = null, cleared = false, mongoSession = null } = {}) {
  assertBarcodeTransition(barcode.state, nextState);
  barcode.state = nextState;
  barcode.sessionId = sessionId;
  barcode.orderId = orderId;
  barcode.reservedAt = cleared ? null : barcode.reservedAt;
  barcode.soldAt = cleared ? null : barcode.soldAt;
  barcode.returnedAt = cleared ? null : barcode.returnedAt;
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  return barcode;
}

export async function reserveBarcode(userId, code, sessionId, mongoSession = null) {
  const barcode = await getBarcodeByCode(userId, code);
  if (!barcode) {
    throw new Error("Barcode not found");
  }

  if (barcode.state === BARCODE_STATES.SOLD) {
    throw new Error("Barcode already sold");
  }

  assertBarcodeTransition(barcode.state, BARCODE_STATES.RESERVED);
  barcode.state = BARCODE_STATES.RESERVED;
  barcode.sessionId = sessionId || null;
  barcode.reservedAt = new Date();
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  await removeBarcodeFromProductCache(userId, barcode.productId, barcode.code, mongoSession);
  return barcode;
}

export async function reserveBarcodeForOrder(userId, code, orderId, mongoSession = null) {
  const barcode = await getBarcodeByCode(userId, code);
  if (!barcode) {
    throw new Error("Barcode not found");
  }

  if (barcode.state === BARCODE_STATES.SOLD) {
    throw new Error("Barcode already sold");
  }

  assertBarcodeTransition(barcode.state, BARCODE_STATES.RESERVED);
  barcode.state = BARCODE_STATES.RESERVED;
  barcode.orderId = orderId || null;
  barcode.reservedAt = new Date();
  barcode.sessionId = null;
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  await removeBarcodeFromProductCache(userId, barcode.productId, barcode.code, mongoSession);
  return barcode;
}

export async function sellBarcode(userId, code, orderId, mongoSession = null) {
  const barcode = await getBarcodeByCode(userId, code);
  if (!barcode) {
    throw new Error("Barcode not found");
  }

  if (barcode.state === BARCODE_STATES.SOLD) {
    return barcode;
  }

  assertBarcodeTransition(barcode.state, BARCODE_STATES.SOLD);
  barcode.state = BARCODE_STATES.SOLD;
  barcode.orderId = orderId || null;
  barcode.soldAt = new Date();
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  await removeBarcodeFromProductCache(userId, barcode.productId, barcode.code, mongoSession);
  return barcode;
}

export async function releaseReservedBarcode(userId, code, mongoSession = null) {
  const barcode = await getBarcodeByCode(userId, code);
  if (!barcode) {
    throw new Error("Barcode not found");
  }

  if (barcode.state !== BARCODE_STATES.RESERVED) {
    return barcode;
  }

  barcode.state = BARCODE_STATES.AVAILABLE;
  barcode.orderId = null;
  barcode.sessionId = null;
  barcode.reservedAt = null;
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  await addBarcodeBackToProductCache(userId, barcode.productId, barcode.code, mongoSession);
  return barcode;
}

export async function returnBarcode(userId, code, mongoSession = null) {
  const barcode = await getBarcodeByCode(userId, code);
  if (!barcode) {
    throw new Error("Barcode not found");
  }

  if (barcode.state !== BARCODE_STATES.SOLD) {
    throw new Error("Only sold barcodes can be returned");
  }

  barcode.state = BARCODE_STATES.RETURNED;
  barcode.returnedAt = new Date();
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  barcode.state = BARCODE_STATES.AVAILABLE;
  barcode.sessionId = null;
  barcode.orderId = null;
  barcode.reservedAt = null;
  barcode.soldAt = null;
  barcode.returnedAt = null;
  await barcode.save(mongoSession ? { session: mongoSession } : undefined);
  await addBarcodeBackToProductCache(userId, barcode.productId, barcode.code, mongoSession);

  return barcode;
}
