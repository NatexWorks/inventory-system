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
import { buildMeta, sanitizeSearch } from "../lib/apiHelpers";
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
  if (!code) {
    return {
      productId: item.productId,
      barcodeId: item.barcodeId || null,
      barcode: "",
    };
  }

  const query = Barcode.findOne({ userId, code });
  if (session) {
    query.session(session);
  }

  const barcode = await query.lean();
  if (!barcode) {
    return {
      productId: item.productId,
      barcodeId: item.barcodeId || null,
      barcode: code,
    };
  }

  return {
    productId: barcode.productId || item.productId,
    barcodeId: barcode._id || item.barcodeId || null,
    barcode: barcode.code || code,
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

export async function createOrder(userId, input, settings = {}) {
  await dbConnect();
  const session = await mongoose.startSession();
  try {
    let createdOrder = null;

    await session.withTransaction(async () => {
      const items = [];
      for (const item of input.items || []) {
        const identity = await resolveBarcodeIdentity(userId, item, session);
        items.push({
          productId: identity.productId,
          barcodeId: identity.barcodeId,
          barcode: identity.barcode,
          name: item.name,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
          lineTotal: Number(item.lineTotal || Number(item.price || 0) * Number(item.quantity || 1)),
        });
      }

      const amounts = calculateAmounts(items, settings?.billing?.taxPercentage || 0, input.discountAmount || 0);
      const [order] = await Order.create(
        [
          {
            userId,
            sessionId: input.sessionId || null,
            orderNumber: nextOrderNumber(),
            customerName: input.customerName || "Walk-in Customer",
            customerPhone: input.customerPhone || "",
            status: input.status || ORDER_STATES.DRAFT,
            items,
            subtotal: amounts.subtotal,
            taxAmount: input.taxAmount ?? amounts.taxAmount,
            discountAmount: input.discountAmount || 0,
            totalAmount: input.totalAmount ?? amounts.totalAmount,
            notes: input.notes || "",
          },
        ],
        { session }
      );

      for (const item of order.items || []) {
        if (item.barcode) {
          await reserveBarcodeForOrder(userId, item.barcode, order._id, session);
        }
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

        if (resolvedIdentity.barcode) {
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
  const session = await mongoose.startSession();
  try {
    let returnedOrder = null;

    await session.withTransaction(async () => {
      const originalOrder = await Order.findOne({ _id: originalOrderId, userId }).session(session);
      if (!originalOrder) {
        throw new Error("Original order not found");
      }

      if (originalOrder.status !== ORDER_STATES.COMPLETED) {
        throw new Error("Only completed orders can be returned");
      }

      const returnItems = input.items || originalOrder.items;
      for (const item of returnItems) {
        await Product.updateOne(
          { _id: item.productId, userId },
          { $inc: { stock: Number(item.quantity || 1) } },
          { session }
        );
        if (item.barcode) {
          await returnBarcode(userId, item.barcode, session);
        }
      }

      returnedOrder = await ReturnModel.create(
        [
          {
            userId,
            items: returnItems,
            returnNumber: `RET-${Date.now().toString().slice(-8)}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
            notes: input.notes || "Return processed",
            originalOrderId: originalOrder._id,
            processedBy: input.processedBy || null,
            processedAt: new Date(),
          },
        ],
        { session }
      );
    });

    return returnedOrder?.[0] || null;
  } finally {
    session.endSession();
  }
}
