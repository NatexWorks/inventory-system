// Report service aggregates dashboard and analytics data.
import mongoose from "mongoose";
import dbConnect from "../lib/db";
import Product from "../models/productSchema";
import Order from "../models/orderSchema";
import Category from "../models/categorySchema";

function toObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value)) ? new mongoose.Types.ObjectId(String(value)) : null;
}

export async function buildDashboardSummary(userId) {
  await dbConnect();
  const userObjectId = toObjectId(userId);

  const [totalProducts, lowStockProducts, recentOrders, lowStockItems, topProducts, revenueAgg, categoryAgg] = await Promise.all([
    Product.countDocuments({ userId }),
    Product.countDocuments({ userId, stock: { $lte: 5 } }),
    Order.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Product.find({ userId, stock: { $lte: 5 } }).sort({ stock: 1, updatedAt: -1 }).limit(5).lean(),
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
  ]);

  return {
    totalProducts,
    lowStockProducts,
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

  const categories = await Category.find({ userId }).lean();
  const products = await Product.find({ userId }).lean();
  const orders = await Order.find({ userId, status: "COMPLETED" }).lean();

  const analytics = categories.map((category) => {
    const matches = products.filter((product) => String(product.categoryId || "") === String(category._id));
    const revenue = orders.reduce((sum, order) => {
      const orderTotal = order.items
        .filter((item) => matches.some((product) => String(product._id) === String(item.productId)))
        .reduce((itemSum, item) => itemSum + Number(item.lineTotal || item.price * item.quantity || 0), 0);
      return sum + orderTotal;
    }, 0);
    const sales = orders.reduce((sum, order) => {
      const units = order.items
        .filter((item) => matches.some((product) => String(product._id) === String(item.productId)))
        .reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0);
      return sum + units;
    }, 0);
    return {
      categoryId: category._id,
      name: category.name,
      productCount: matches.length,
      revenue,
      sales,
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
