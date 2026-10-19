// Report service aggregates dashboard and analytics data.
import mongoose from "mongoose";
import dbConnect from "../lib/db";
import Product from "../models/productSchema";
import Order from "../models/orderSchema";
import Category from "../models/categorySchema";
import Settings from "../models/settingsSchema";

function toObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value)) ? new mongoose.Types.ObjectId(String(value)) : null;
}

export async function buildDashboardSummary(userId) {
  await dbConnect();
  const userObjectId = toObjectId(userId);
  const workspaceSettings = await Settings.findOne({ userId }).select("inventory.lowStockThreshold notifications.lowStockAlerts notifications.orderUpdates notifications.weeklySummary").lean();
  const lowStockThreshold = Math.max(0, Number(workspaceSettings?.inventory?.lowStockThreshold ?? 5));
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  const [totalProducts, lowStockProducts, recentOrders, lowStockItems, topProducts, revenueAgg, categoryAgg, inventoryValueAgg, weeklySummaryAgg] = await Promise.all([
    Product.countDocuments({ userId }),
    Product.countDocuments({ userId, stock: { $lte: lowStockThreshold } }),
    Order.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Product.find({ userId, stock: { $lte: lowStockThreshold } }).sort({ stock: 1, updatedAt: -1 }).limit(5).lean(),
    Product.find({ userId }).sort({ stock: -1, updatedAt: -1 }).limit(5).lean(),
    Order.aggregate([
      { $match: { userId: userObjectId } },
      { $match: { status: "COMPLETED" } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalSales: { $sum: 1 } } },
    ]),
    Category.aggregate([
      { $match: { userId: userObjectId } },
      { $lookup: { from: "products", localField: "_id", foreignField: "categoryId", as: "products" } },
      { $project: { name: 1, count: { $size: "$products" } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Product.aggregate([
      { $match: { userId: userObjectId } },
      { $group: {
        _id: null,
        inventoryValue: { $sum: { $multiply: [{ $ifNull: ["$costPrice", 0] }, { $ifNull: ["$stock", 0] }] } },
        retailInventoryValue: { $sum: { $multiply: [{ $ifNull: ["$price", 0] }, { $ifNull: ["$stock", 0] }] } },
        totalUnitsInStock: { $sum: { $ifNull: ["$stock", 0] } },
      } },
    ]),
    Order.aggregate([
      { $match: { userId: userObjectId, status: "COMPLETED", createdAt: { $gte: weekStart } } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: { $ifNull: ["$totalAmount", 0] } },
      } },
    ]),
  ]);

  return {
    totalProducts,
    lowStockProducts,
    lowStockThreshold,
    lowStockAlertsEnabled: workspaceSettings?.notifications?.lowStockAlerts ?? true,
    orderUpdatesEnabled: workspaceSettings?.notifications?.orderUpdates ?? true,
    weeklySummaryEnabled: workspaceSettings?.notifications?.weeklySummary ?? true,
    weeklySummary: {
      totalRevenue: weeklySummaryAgg[0]?.totalRevenue || 0,
      totalOrders: weeklySummaryAgg[0]?.totalOrders || 0,
      averageOrderValue: weeklySummaryAgg[0]?.averageOrderValue || 0,
    },
    inventoryValue: inventoryValueAgg[0]?.inventoryValue || 0,
    retailInventoryValue: inventoryValueAgg[0]?.retailInventoryValue || 0,
    totalUnitsInStock: inventoryValueAgg[0]?.totalUnitsInStock || 0,
    recentOrders,
    totalRevenue: revenueAgg[0]?.totalRevenue || 0,
    totalSales: revenueAgg[0]?.totalSales || 0,
    topCategory: categoryAgg[0]?.name || "N/A",
    lowStockItems,
    topProducts,
  };
}

export async function buildCategoryAnalytics(userId) {
  await dbConnect();
  const userObjectId = toObjectId(userId);
  if (!userObjectId) throw new Error("Invalid workspace user");

  // Aggregate in MongoDB instead of loading every product and completed order
  // and repeatedly filtering those large arrays in application memory.
  const [categories, productCounts, salesByCategory] = await Promise.all([
    Category.find({ userId }).select("name").lean(),
    Product.aggregate([
      { $match: { userId: userObjectId, categoryId: { $ne: null } } },
      { $group: { _id: "$categoryId", productCount: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { userId: userObjectId, status: "COMPLETED" } },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },
      { $match: { "product.userId": userObjectId, "product.categoryId": { $ne: null } } },
      {
        $group: {
          _id: "$product.categoryId",
          revenue: {
            $sum: {
              $cond: [
                { $ne: [{ $ifNull: ["$items.lineTotal", 0] }, 0] },
                "$items.lineTotal",
                { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }] },
              ],
            },
          },
          sales: { $sum: { $ifNull: ["$items.quantity", 0] } },
        },
      },
    ]),
  ]);

  const productCountByCategory = new Map(productCounts.map((item) => [String(item._id), Number(item.productCount || 0)]));
  const salesByCategoryId = new Map(salesByCategory.map((item) => [String(item._id), item]));

  const analytics = categories.map((category) => {
    const categorySales = salesByCategoryId.get(String(category._id));
    return {
      categoryId: category._id,
      name: category.name,
      productCount: productCountByCategory.get(String(category._id)) || 0,
      revenue: Number(categorySales?.revenue || 0),
      sales: Number(categorySales?.sales || 0),
    };
  });

  const bestCategory = analytics.reduce((best, item) => (item.revenue > (best?.revenue || 0) ? item : best), null);
  const worstCategory = analytics.reduce((worst, item) => (item.revenue < (worst?.revenue ?? Infinity) ? item : worst), null);

  return {
    analytics,
    bestCategory,
    worstCategory,
  };
}


// Report time ranges and all report datasets are scoped to the authenticated workspace.
const REPORT_TIME_ZONE = "Asia/Kolkata";

function getIndiaDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day), hour: Number(value.hour) };
}

function indiaDateToUtc(year, month, day, hour = 0) {
  // India Standard Time is UTC+05:30; convert the local calendar boundary to UTC.
  return new Date(Date.UTC(year, month - 1, day, hour) - 330 * 60 * 1000);
}

function shiftCalendarDate(year, month, day, deltaDays) {
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function formatDateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function reportPeriodConfig(period, now = new Date()) {
  const today = getIndiaDateParts(now);
  const dayCount = period === "quarter" ? 90 : 30;
  if (period === "day") {
    const start = indiaDateToUtc(today.year, today.month, today.day);
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      key: `${formatDateKey(today)}T${String(hour).padStart(2, "0")}`,
      label: `${String(hour).padStart(2, "0")}:00`,
    }));
    return { period, start, end: now, bucketFormat: "%Y-%m-%dT%H", buckets };
  }
  if (period === "year") {
    const firstMonth = new Date(Date.UTC(today.year, today.month - 1 - 11, 1));
    const buckets = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
      const year = monthDate.getUTCFullYear();
      const month = monthDate.getUTCMonth() + 1;
      return {
        key: `${year}-${String(month).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: REPORT_TIME_ZONE })
          .format(new Date(Date.UTC(year, month - 1, 15, 12))),
      };
    });
    return {
      period,
      start: indiaDateToUtc(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + 1, 1),
      end: now,
      bucketFormat: "%Y-%m",
      buckets,
    };
  }

  const days = period === "quarter" ? dayCount : 30;
  const startParts = shiftCalendarDate(today.year, today.month, today.day, -(days - 1));
  const start = indiaDateToUtc(startParts.year, startParts.month, startParts.day);
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = shiftCalendarDate(startParts.year, startParts.month, startParts.day, index);
    return {
      key: formatDateKey(date),
      label: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: REPORT_TIME_ZONE })
        .format(indiaDateToUtc(date.year, date.month, date.day, 12)),
    };
  });
  return { period, start, end: now, bucketFormat: "%Y-%m-%d", buckets };
}

export async function buildOperationalReports(userId, requestedPeriod = "month") {
  await dbConnect();
  const allowedPeriods = new Set(["day", "month", "quarter", "year"]);
  const period = allowedPeriods.has(requestedPeriod) ? requestedPeriod : "month";
  const userObjectId = toObjectId(userId);
  if (!userObjectId) throw new Error("Invalid workspace user");

  const config = reportPeriodConfig(period);
  const dateQuery = { $gte: config.start, $lte: config.end };
  const completedOrdersMatch = { userId: userObjectId, status: "COMPLETED", createdAt: dateQuery };

  const [trendAgg, orders, products, productSalesAgg, categorySalesAgg] = await Promise.all([
    Order.aggregate([
      { $match: completedOrdersMatch },
      {
        $addFields: {
          unitsInOrder: {
            $sum: {
              $map: {
                input: { $ifNull: ["$items", []] },
                as: "item",
                in: { $ifNull: ["$$item.quantity", 0] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: config.bucketFormat, date: "$createdAt", timezone: REPORT_TIME_ZONE } },
          revenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
          orders: { $sum: 1 },
          unitsSold: { $sum: "$unitsInOrder" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Include every order status in the Orders report; the Sales report only includes completed orders.
    Order.find({ userId, createdAt: dateQuery })
      .sort({ createdAt: -1 })
      .select("orderNumber customerName customerPhone status items subtotal taxAmount discountAmount totalAmount createdAt notes")
      .lean(),
    Product.find({ userId })
      .select("name sku category stock price costPrice updatedAt")
      .sort({ name: 1 })
      .lean(),
    Order.aggregate([
      { $match: completedOrdersMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          name: { $first: "$items.name" },
          unitsSold: { $sum: { $ifNull: ["$items.quantity", 0] } },
          revenue: {
            $sum: {
              $ifNull: [
                "$items.lineTotal",
                { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }] },
              ],
            },
          },
          orders: { $addToSet: "$_id" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([
      { $match: completedOrdersMatch },
      { $unwind: "$items" },
      { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.userId": userObjectId } },
      {
        $group: {
          _id: { $ifNull: ["$product.category", "Uncategorized"] },
          productIds: { $addToSet: "$items.productId" },
          orderIds: { $addToSet: "$_id" },
          unitsSold: { $sum: { $ifNull: ["$items.quantity", 0] } },
          revenue: {
            $sum: {
              $ifNull: [
                "$items.lineTotal",
                { $multiply: [{ $ifNull: ["$items.price", 0] }, { $ifNull: ["$items.quantity", 0] }] },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          productCount: { $size: "$productIds" },
          orderCount: { $size: "$orderIds" },
          unitsSold: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const trendMap = new Map(trendAgg.map((bucket) => [bucket._id, bucket]));
  const salesTrend = config.buckets.map((bucket) => {
    const entry = trendMap.get(bucket.key);
    return {
      ...bucket,
      revenue: Number(entry?.revenue || 0),
      orders: Number(entry?.orders || 0),
      unitsSold: Number(entry?.unitsSold || 0),
    };
  });

  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const productPerformance = productSalesAgg.map((item) => {
    const product = productMap.get(String(item._id));
    return {
      productId: String(item._id),
      name: item.name || product?.name || "Unknown product",
      sku: product?.sku || "",
      category: product?.category || "Uncategorized",
      unitsSold: Number(item.unitsSold || 0),
      revenue: Number(item.revenue || 0),
      orders: Array.isArray(item.orders) ? item.orders.length : 0,
      currentStock: Number(product?.stock || 0),
      unitPrice: Number(product?.price || 0),
    };
  });

  const threshold = Math.max(0, Number((await Settings.findOne({ userId }).select("inventory.lowStockThreshold").lean())?.inventory?.lowStockThreshold ?? 5));
  const inventory = products.map((product) => {
    const stock = Number(product.stock || 0);
    const costPrice = Number(product.costPrice || 0);
    const price = Number(product.price || 0);
    return {
      productId: String(product._id),
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "Uncategorized",
      stock,
      costPrice,
      price,
      costValue: stock * costPrice,
      retailValue: stock * price,
      status: stock <= 0 ? "Out of Stock" : stock <= threshold ? "Low Stock" : "In Stock",
      updatedAt: product.updatedAt || null,
    };
  });

  const revenue = salesTrend.reduce((sum, item) => sum + item.revenue, 0);
  const completedOrderCount = salesTrend.reduce((sum, item) => sum + item.orders, 0);
  const unitsSold = salesTrend.reduce((sum, item) => sum + item.unitsSold, 0);
  const inventoryCostValue = inventory.reduce((sum, item) => sum + item.costValue, 0);
  const inventoryRetailValue = inventory.reduce((sum, item) => sum + item.retailValue, 0);

  return {
    period,
    range: {
      start: config.start.toISOString(),
      end: config.end.toISOString(),
      label: period === "day" ? "Today" : period === "month" ? "Last 30 days" : period === "quarter" ? "Last 90 days" : "Last 12 months",
    },
    salesTrend,
    orders: orders.map((order) => ({
      orderId: String(order._id),
      orderNumber: order.orderNumber || "",
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      status: order.status || "",
      createdAt: order.createdAt || null,
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      units: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      subtotal: Number(order.subtotal || 0),
      tax: Number(order.taxAmount || 0),
      discount: Number(order.discountAmount || 0),
      total: Number(order.totalAmount || 0),
    })),
    inventory,
    productPerformance,
    categoryPerformance: categorySalesAgg.map((item) => ({
      name: item.name || "Uncategorized",
      productCount: Number(item.productCount || 0),
      orders: Number(item.orderCount || 0),
      unitsSold: Number(item.unitsSold || 0),
      revenue: Number(item.revenue || 0),
    })),
    summary: {
      revenue,
      completedOrders: completedOrderCount,
      unitsSold,
      averageOrderValue: completedOrderCount ? revenue / completedOrderCount : 0,
      inventoryProducts: inventory.length,
      inventoryUnits: inventory.reduce((sum, item) => sum + item.stock, 0),
      inventoryCostValue,
      inventoryRetailValue,
      lowStockProducts: inventory.filter((item) => item.status !== "In Stock").length,
      outOfStockProducts: inventory.filter((item) => item.status === "Out of Stock").length,
    },
  };
}
