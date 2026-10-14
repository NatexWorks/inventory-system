// Order service handles checkout, approval, cancellation, and returns.
import crypto from "node:crypto";
import mongoose from "mongoose";
import dbConnect from "../lib/db";
import Order from "../models/orderSchema";
import Product from "../models/productSchema";
import Barcode from "../models/barcodeSchema";
import Session from "../models/sessionSchema";
import ReturnModel from "../models/returnSchema";
import { ORDER_STATES, assertOrderTransition } from "../lib/stateMachine";
import { buildMeta, sanitizeSearch, HttpError } from "../lib/apiHelpers";
import { reserveBarcodeForOrder, releaseReservedBarcode, sellBarcode, returnBarcode } from "./barcodeService";

function nextOrderNumber() {
  return `ORD-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function calculateAmounts(items, taxPercentage = 0, discountAmount = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || item.price * item.quantity || 0), 0);
  const taxable = Math.max(0, subtotal - Number(discountAmount || 0));
  const taxAmount = taxable * (Number(taxPercentage || 0) / 100);
  const totalAmount = taxable + taxAmount;

  return {
    subtotal,
    taxAmount,
    totalAmount,
  };
}

async function resolveBarcodeIdentity(userId, item, session = null) {
  const code = String(item?.barcode || "").trim();
  const barcodeQuery = code ? Barcode.findOne({ userId, code }) : null;
  if (barcodeQuery && session) barcodeQuery.session(session);
  const barcode = barcodeQuery ? await barcodeQuery.lean() : null;
  const productId = barcode?.productId || item.productId;
  const productQuery = Product.findOne({ _id: productId, userId }).select("barcodeMode");
  if (session) productQuery.session(session);
  const product = productId ? await productQuery.lean() : null;

  return {
    productId,
    barcodeId: barcode?._id || item.barcodeId || null,
    barcode: code ? (barcode?.code || code) : "",
    // PRODUCT barcodes identify a reusable product type; UNIT barcodes are
    // unique physical units and must retain the reserve/sell lifecycle.
    barcodeMode: product?.barcodeMode || "PRODUCT",
  };
}

export async function listOrders(userId, { page = 1, limit = 10, search = "" } = {}) {
  await dbConnect();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
  const filter = {
    userId,
    ...(search
      ? {
          $or: [
            { orderNumber: { $regex: sanitizeSearch(search), $options: "i" } },
            { customerName: { $regex: sanitizeSearch(search), $options: "i" } },
            { status: { $regex: sanitizeSearch(search), $options: "i" } },
          ],
        }
      : {}),
  };

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: buildMeta({ page: safePage, limit: safeLimit, total: totalOrders }),
  };
}

export async function getOrderById(userId, id) {
  await dbConnect();
  return Order.findOne({ _id: id, userId }).lean();
}


export async function updatePendingOrder(userId, id, input, settings = {}) {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let updatedOrder = null;
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: id, userId,
        status: { $in: [ORDER_STATES.DRAFT, ORDER_STATES.PENDING_APPROVAL] },
      }).session(session);
      if (!order) throw new Error("Only draft or pending orders can be edited.");
      if (!Array.isArray(input.items) || input.items.length === 0) throw new Error("Add at least one product.");

      const nextItems = [];
      const nextUnitCodes = new Set();
      const itemKeys = new Set();
      for (const item of input.items) {
        const identity = await resolveBarcodeIdentity(userId, item, session);
        if (!identity.productId) throw new Error("An order item has no valid product.");
        const productQuery = Product.findOne({ _id: identity.productId, userId }).select("name price stock barcodeMode");
        productQuery.session(session);
        const product = await productQuery.lean();
        if (!product) throw new Error("One of the selected products no longer exists.");

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`Quantity for ${product.name} must be a positive whole number.`);
        if (identity.barcode && identity.barcodeMode === "UNIT" && quantity !== 1) {
          throw new Error(`Barcode ${identity.barcode} represents one unit only.`);
        }
        if (!(identity.barcode && identity.barcodeMode === "UNIT") && quantity > Number(product.stock || 0)) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${Number(product.stock || 0)}.`);
        }

        const isUnitBarcode = Boolean(identity.barcode && identity.barcodeMode === "UNIT");
        const key = isUnitBarcode ? `barcode:${identity.barcode}` : `product:${String(product._id)}`;
        if (itemKeys.has(key)) throw new Error(`Duplicate order line for ${product.name}.`);
        itemKeys.add(key);
        if (isUnitBarcode) nextUnitCodes.add(identity.barcode);

        const price = Number(product.price || 0);
        nextItems.push({
          productId: product._id, barcodeId: identity.barcodeId || null,
          barcode: identity.barcode || "", name: product.name, quantity, price,
          lineTotal: price * quantity,
        });
      }

      const discountAmount = Number(input.discountAmount ?? order.discountAmount ?? 0);
      const subtotal = nextItems.reduce((sum, item) => sum + item.lineTotal, 0);
      if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > subtotal) {
        throw new Error("Discount must be between zero and the order subtotal.");
      }
      const amounts = calculateAmounts(nextItems, settings?.billing?.taxPercentage || 0, discountAmount);

      const oldUnitCodes = new Set();
      for (const oldItem of order.items || []) {
        const identity = await resolveBarcodeIdentity(userId, oldItem, session);
        if (identity.barcode && identity.barcodeMode === "UNIT") oldUnitCodes.add(identity.barcode);
      }
      for (const code of oldUnitCodes) {
        if (!nextUnitCodes.has(code)) await releaseReservedBarcode(userId, code, session);
      }
      for (const code of nextUnitCodes) {
        if (!oldUnitCodes.has(code)) await reserveBarcodeForOrder(userId, code, order._id, session);
      }

      order.items = nextItems;
      order.subtotal = amounts.subtotal;
      order.taxAmount = amounts.taxAmount;
      order.discountAmount = discountAmount;
      order.totalAmount = amounts.totalAmount;
      if (input.customerName !== undefined) order.customerName = input.customerName;
      if (input.customerPhone !== undefined) order.customerPhone = input.customerPhone;
      if (input.notes !== undefined) order.notes = input.notes;
      await order.save({ session });
      updatedOrder = order;
    });
    return updatedOrder;
  } finally {
    session.endSession();
  }
}

export async function createOrder(userId, input, settings = {}) {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let createdOrder = null;

    await session.withTransaction(async () => {
      const items = [];
      const unitBarcodesToReserve = [];
      for (const item of input.items || []) {
        const identity = await resolveBarcodeIdentity(userId, item, session);
        if (!identity.productId) throw new HttpError("Every order item must reference a valid product", 400);

        const productQuery = Product.findOne({ _id: identity.productId, userId }).select("name price stock barcodeMode");
        productQuery.session(session);
        const product = await productQuery.lean();
        if (!product) throw new HttpError("One of the selected products no longer exists", 404);

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new HttpError(`Quantity for ${product.name} must be a positive whole number`, 400);
        }
        if (identity.barcode && identity.barcodeMode === "UNIT" && quantity !== 1) {
          throw new HttpError(`Barcode ${identity.barcode} represents one unit only`, 400);
        }

        const price = Number(product.price || 0);
        items.push({
          productId: identity.productId,
          barcodeId: identity.barcodeId,
          barcode: identity.barcode,
          name: product.name,
          quantity,
          price,
          lineTotal: price * quantity,
        });
        if (identity.barcode && identity.barcodeMode === "UNIT") {
          unitBarcodesToReserve.push(identity.barcode);
        }
      }

      const discountAmount = Number(input.discountAmount || 0);
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > subtotal) {
        throw new HttpError("Discount must be between zero and the order subtotal", 400);
      }
      const amounts = calculateAmounts(items, settings?.billing?.taxPercentage || 0, discountAmount);
      const [order] = await Order.create(
        [{
          userId,
          sessionId: input.sessionId || null,
          orderNumber: nextOrderNumber(),
          customerName: input.customerName || "Walk-in Customer",
          customerPhone: input.customerPhone || "",
          status: input.status || ORDER_STATES.DRAFT,
          items,
          subtotal: amounts.subtotal,
          taxAmount: amounts.taxAmount,
          discountAmount,
          totalAmount: amounts.totalAmount,
          notes: input.notes || "",
        }],
        { session }
      );

      for (const code of new Set(unitBarcodesToReserve)) {
        await reserveBarcodeForOrder(userId, code, order._id, session);
      }

      createdOrder = order;
    });

    return createdOrder;
  } finally {
    session.endSession();
  }
}

export async function moveOrderToPendingApproval(userId, id) {
  const order = await Order.findOne({ _id: id, userId });
  if (!order) {
    throw new Error("Order not found");
  }

  assertOrderTransition(order.status, ORDER_STATES.PENDING_APPROVAL);
  order.status = ORDER_STATES.PENDING_APPROVAL;
  await order.save();
  return order;
}

export async function approveOrder(userId, id, approvedBy) {
  const session = await mongoose.startSession();
  try {
    let completedOrder = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: id, userId }).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status === ORDER_STATES.COMPLETED) {
        throw new Error("Order is already completed");
      }

      assertOrderTransition(order.status, ORDER_STATES.COMPLETED);

      for (const item of order.items) {
        const resolvedIdentity = item.barcode
          ? await resolveBarcodeIdentity(userId, item, session)
          : { productId: item.productId, barcode: "", barcodeId: item.barcodeId || null };

        const result = await Product.updateOne(
          { _id: resolvedIdentity.productId, userId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session }
        );

        if (!result.matchedCount) {
          throw new Error(`Insufficient stock for ${item.name || item.productId}`);
        }

        if (resolvedIdentity.barcode && resolvedIdentity.barcodeMode === "UNIT") {
          await sellBarcode(userId, resolvedIdentity.barcode, order._id, session);
        }
      }

      order.status = ORDER_STATES.COMPLETED;
      order.approvedBy = approvedBy || null;
      order.approvedAt = new Date();
      await order.save({ session });

      if (order.sessionId) {
        await Session.updateOne(
          { _id: order.sessionId, userId },
          { $set: { status: "COMPLETED", orderId: order._id } },
          { session }
        );
      }

      completedOrder = order;
    });

    return completedOrder;
  } finally {
    session.endSession();
  }
}

export async function cancelOrder(userId, id, cancelledBy) {
  const session = await mongoose.startSession();
  try {
    let cancelledOrder = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: id, userId }).session(session);
      if (!order) {
        throw new Error("Order not found");
      }

      if (order.status === ORDER_STATES.COMPLETED) {
        throw new Error("Completed orders can only be returned");
      }

      assertOrderTransition(order.status, ORDER_STATES.CANCELLED);

      for (const item of order.items || []) {
        if (item.barcode) {
          await releaseReservedBarcode(userId, item.barcode, session);
        }
      }

      order.status = ORDER_STATES.CANCELLED;
      order.cancelledBy = cancelledBy || null;
      order.cancelledAt = new Date();
      await order.save({ session });
      cancelledOrder = order;
    });

    return cancelledOrder;
  } finally {
    session.endSession();
  }
}

export async function returnOrder(userId, originalOrderId, input = {}) {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let returnedOrder = null;

    await session.withTransaction(async () => {
      const originalOrder = await Order.findOne({ _id: originalOrderId, userId }).session(session);
      if (!originalOrder) throw new HttpError("Original order not found", 404);
      if (originalOrder.status !== ORDER_STATES.COMPLETED) {
        throw new HttpError("Only completed orders can be returned", 400);
      }

      const returnItems = input.items || originalOrder.items;
      if (!Array.isArray(returnItems) || returnItems.length === 0) {
        throw new HttpError("Select at least one item to return", 400);
      }

      const priorReturns = await ReturnModel.find({
        userId,
        originalOrderId: originalOrder._id,
        status: "COMPLETED",
      }).session(session).lean();

      const soldByProduct = new Map();
      for (const item of originalOrder.items || []) {
        const key = String(item.productId);
        soldByProduct.set(key, (soldByProduct.get(key) || 0) + Number(item.quantity || 0));
      }

      const returnedByProduct = new Map();
      const returnedUnitCodes = new Set();
      for (const prior of priorReturns) {
        for (const item of prior.items || []) {
          const key = String(item.productId);
          returnedByProduct.set(key, (returnedByProduct.get(key) || 0) + Number(item.quantity || 0));
          if (item.barcode) returnedUnitCodes.add(String(item.barcode));
        }
      }

      const requestedByProduct = new Map();
      const requestedUnitCodes = new Set();
      const normalizedItems = [];

      for (const item of returnItems) {
        const productId = String(item?.productId || "");
        const quantity = Number(item?.quantity);
        if (!productId || !Number.isInteger(quantity) || quantity < 1) {
          throw new HttpError("Each returned item must have a valid product and positive whole-number quantity", 400);
        }
        if (!soldByProduct.has(productId)) {
          throw new HttpError("A returned product was not part of the original order", 400);
        }

        const productQuery = Product.findOne({ _id: productId, userId }).select("name barcodeMode");
        productQuery.session(session);
        const product = await productQuery.lean();
        if (!product) throw new HttpError("Returned product not found in this workspace", 404);

        const barcode = String(item.barcode || "").trim();
        const isUnitBarcode = product.barcodeMode === "UNIT";
        let sourceItem;

        if (isUnitBarcode) {
          if (!barcode || quantity !== 1) {
            throw new HttpError("Unit-barcode returns must specify the sold unit barcode and quantity 1", 400);
          }
          sourceItem = (originalOrder.items || []).find((line) =>
            String(line.productId) === productId && String(line.barcode || "") === barcode
          );
          if (!sourceItem) throw new HttpError("This unit barcode was not sold in the original order", 400);
          if (returnedUnitCodes.has(barcode) || requestedUnitCodes.has(barcode)) {
            throw new HttpError("This unit has already been returned", 409);
          }
          requestedUnitCodes.add(barcode);
        } else {
          sourceItem = (originalOrder.items || []).find((line) => String(line.productId) === productId);
          const alreadyReturned = returnedByProduct.get(productId) || 0;
          const requestedSoFar = requestedByProduct.get(productId) || 0;
          if (alreadyReturned + requestedSoFar + quantity > soldByProduct.get(productId)) {
            throw new HttpError(`Return quantity exceeds the remaining sold quantity for ${product.name}`, 400);
          }
          requestedByProduct.set(productId, requestedSoFar + quantity);
        }

        if (!sourceItem) throw new HttpError("Could not match the return item to the original order", 400);
        normalizedItems.push({
          productId: sourceItem.productId,
          barcodeId: isUnitBarcode ? (sourceItem.barcodeId || item.barcodeId || null) : null,
          barcode: isUnitBarcode ? barcode : "",
          quantity,
          price: Number(sourceItem.price || 0),
        });
      }

      // Touch the original order in the same transaction to serialize concurrent
      // return attempts against the same order.
      originalOrder.returnRevision = Number(originalOrder.returnRevision || 0) + 1;
      await originalOrder.save({ session });

      for (const item of normalizedItems) {
        const productUpdate = await Product.updateOne(
          { _id: item.productId, userId },
          { $inc: { stock: item.quantity } },
          { session }
        );
        if (!productUpdate.matchedCount) {
          throw new HttpError("Returned product not found in this workspace", 404);
        }
        if (item.barcode) await returnBarcode(userId, item.barcode, session);
      }

      returnedOrder = await ReturnModel.create(
        [{
          userId,
          items: normalizedItems,
          returnNumber: `RET-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
          notes: input.notes || "Return processed",
          originalOrderId: originalOrder._id,
          processedBy: input.processedBy || null,
          processedAt: new Date(),
        }],
        { session }
      );
    });

    return returnedOrder?.[0] || null;
  } finally {
    session.endSession();
  }
}
