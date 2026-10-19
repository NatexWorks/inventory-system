import mongoose from "mongoose";
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import Product from "@/app/models/productSchema";
import Notification from "@/app/models/notificationSchema";
import Settings from "@/app/models/settingsSchema";

let notificationIndexesPromise;

async function ensureNotificationIndexes() {
  if (!notificationIndexesPromise) {
    notificationIndexesPromise = Notification.init().catch((error) => {
      notificationIndexesPromise = null;
      throw error;
    });
  }
  await notificationIndexesPromise;
}

function stockAlertDetails(product, threshold) {
  const stock = Math.max(0, Number(product.stock) || 0);
  const outOfStock = stock <= 0;
  return {
    title: product.name || "Unnamed product",
    message: outOfStock
      ? "This item is out of stock."
      : `Only ${stock} unit(s) left (alert threshold: ${threshold}).`,
    level: outOfStock ? "critical" : "warning",
  };
}

// Reconcile current stock conditions with persisted events. A product gets one
// active alert while it remains below the threshold; it cannot become unread
// again until stock recovers and later falls below the threshold once more.
async function reconcileLowStockAlerts(userId, threshold) {
  const lowStockProducts = await Product.find({
    userId,
    isActive: { $ne: false },
    stock: { $lte: threshold },
  })
    .select("_id name stock")
    .sort({ stock: 1, name: 1 })
    .lean();

  const lowStockIds = lowStockProducts.map((product) => product._id);
  const noLongerLowFilter = {
    userId,
    type: "low_stock",
    active: true,
    ...(lowStockIds.length ? { productId: { $nin: lowStockIds } } : {}),
  };

  await Notification.updateMany(
    noLongerLowFilter,
    {
      $set: {
        active: false,
        resolvedAt: new Date(),
        message: "Stock has returned to normal levels.",
      },
    }
  );

  if (lowStockProducts.length === 0) return;

  // Bulk upserts keep repeated polling efficient. Updating an existing active
  // event never changes readAt; an inactive historical event gets a new record.
  const operations = lowStockProducts.map((product) => {
    const details = stockAlertDetails(product, threshold);
    return {
      updateOne: {
        filter: {
          userId,
          productId: product._id,
          type: "low_stock",
          active: true,
        },
        update: {
          $set: {
            title: details.title,
            message: details.message,
            level: details.level,
          },
          $setOnInsert: {
            userId,
            productId: product._id,
            type: "low_stock",
            stockAtCreation: Math.max(0, Number(product.stock) || 0),
            thresholdAtCreation: threshold,
            readAt: null,
            active: true,
            resolvedAt: null,
          },
        },
        upsert: true,
      },
    };
  });

  try {
    await Notification.bulkWrite(operations, { ordered: false });
  } catch (error) {
    const writeErrors = error?.writeErrors || error?.result?.getWriteErrors?.() || [];
    const duplicateOnly = error?.code === 11000
      || (writeErrors.length > 0 && writeErrors.every((item) => item.code === 11000));
    if (!duplicateOnly) throw error;

    // Concurrent requests may race to create an alert. The partial unique
    // index wins that race; retry without upsert to refresh the winning records.
    await Notification.bulkWrite(
      operations.map((operation) => ({
        updateOne: { ...operation.updateOne, upsert: false },
      })),
      { ordered: false }
    );
  }
}

function serializeNotification(item) {
  return {
    id: String(item._id),
    productId: String(item.productId),
    kind: item.level === "critical" ? "Out of stock" : "Low stock",
    level: item.level,
    title: item.title,
    message: item.message,
    href: "/products",
    isRead: Boolean(item.readAt),
    readAt: item.readAt || null,
    active: Boolean(item.active),
    createdAt: item.createdAt,
    resolvedAt: item.resolvedAt || null,
  };
}

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    await ensureNotificationIndexes();

    const settings = await Settings.findOne({ userId: auth.userId })
      .select("inventory.lowStockThreshold notifications.lowStockAlerts")
      .lean();
    const lowStockAlertsEnabled = settings?.notifications?.lowStockAlerts !== false;

    if (!lowStockAlertsEnabled) {
      return success("Low-stock notifications are disabled", {
        notifications: [],
        unreadCount: 0,
      });
    }

    const threshold = Math.max(0, Number(settings?.inventory?.lowStockThreshold ?? 5));
    await reconcileLowStockAlerts(auth.userId, threshold);

    const [items, unreadCount] = await Promise.all([
      Notification.find({
        userId: auth.userId,
        type: "low_stock",
        $or: [{ active: true }, { readAt: null }],
      })
        .sort({ readAt: 1, createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({
        userId: auth.userId,
        type: "low_stock",
        readAt: null,
      }),
    ]);

    return success("Low-stock notifications fetched successfully", {
      notifications: items.map(serializeNotification),
      unreadCount,
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function PATCH(request) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    await ensureNotificationIndexes();
    const body = await parseJsonBody(request);

    if (body.markAllRead === true) {
      const result = await Notification.updateMany(
        { userId: auth.userId, type: "low_stock", readAt: null },
        { $set: { readAt: new Date() } }
      );
      return success("All low-stock notifications marked as read", {
        modifiedCount: result.modifiedCount || 0,
      });
    }

    const id = String(body.id || "");
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return failure("A valid notification ID is required", null, 400);
    }

    const item = await Notification.findOneAndUpdate(
      { _id: id, userId: auth.userId, type: "low_stock", readAt: null },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();

    if (item) {
      return success("Notification marked as read", {
        id: String(item._id),
        readAt: item.readAt,
      });
    }

    const existing = await Notification.findOne({
      _id: id,
      userId: auth.userId,
      type: "low_stock",
    })
      .select("_id readAt")
      .lean();

    if (!existing) {
      return failure("Notification not found", null, 404);
    }

    return success("Notification was already read", {
      id: String(existing._id),
      readAt: existing.readAt,
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
