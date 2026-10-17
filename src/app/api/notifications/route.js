import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import Product from "@/app/models/productSchema";
import Order from "@/app/models/orderSchema";
import Settings from "@/app/models/settingsSchema";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    const settings = await Settings.findOne({ userId: auth.userId }).select("inventory.lowStockThreshold notifications").lean();
    const threshold = Math.max(0, Number(settings?.inventory?.lowStockThreshold ?? 5));
    const notifications = [];

    if (settings?.notifications?.lowStockAlerts !== false) {
      const lowStock = await Product.find({ userId: auth.userId, isActive: { $ne: false }, stock: { $lte: threshold } })
        .select("name stock sku")
        .sort({ stock: 1, name: 1 })
        .limit(12)
        .lean();
      for (const product of lowStock) {
        const outOfStock = Number(product.stock || 0) <= 0;
        notifications.push({
          id: `stock-${product._id}`,
          kind: outOfStock ? "Out of stock" : "Low stock",
          level: outOfStock ? "critical" : "warning",
          title: product.name || "Unnamed product",
          message: outOfStock ? "This item is out of stock." : `Only ${product.stock} unit(s) left (alert threshold: ${threshold}).`,
          href: "/products",
        });
      }
    }

    if (settings?.notifications?.orderUpdates !== false) {
      const recentOrders = await Order.find({ userId: auth.userId })
        .select("orderNumber status totalAmount createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      for (const order of recentOrders) {
        notifications.push({
          id: `order-${order._id}`,
          kind: "Recent order",
          level: "info",
          title: order.orderNumber || "Order update",
          message: `${String(order.status || "Unknown").replaceAll("_", " ")} · ₹${Number(order.totalAmount || 0).toLocaleString("en-IN")}`,
          href: "/orders",
        });
      }
    }

    return success("Notifications fetched successfully", { notifications });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
