// Category service handles category CRUD and category analytics.
import dbConnect from "../lib/db";
import Category from "../models/categorySchema";
import Product from "../models/productSchema";
import Order from "../models/orderSchema";
import { categorySchema } from "../lib/validation";
import { buildMeta } from "../lib/apiHelpers";
import mongoose from "mongoose";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toObjectId(userId) {
  if (mongoose.Types.ObjectId.isValid(String(userId))) {
    return new mongoose.Types.ObjectId(String(userId));
  }

  return userId;
}

export async function listCategories(userId) {
  await dbConnect();

  const categories = await Category.find({ userId }).sort({ createdAt: -1 }).lean();
  const objectId = toObjectId(userId);
  const productCounts = await Product.aggregate([
    { $match: { userId: objectId } },
    { $group: { _id: "$categoryId", count: { $sum: 1 }, stock: { $sum: "$stock" } } },
  ]).catch(() => []);

  return {
    categories,
    productCounts,
  };
}

export async function listCategorySummary(userId) {
  await dbConnect();

  const categories = await Category.find({ userId }).lean();
  const products = await Product.find({ userId }).lean();
  const orders = await Order.find({ userId, status: "COMPLETED" }).lean();
  const counts = new Map();

  for (const product of products) {
    const key = product.categoryId ? String(product.categoryId) : product.category || "Uncategorized";
    const current = counts.get(key) || {
      name: product.category || "Uncategorized",
      products: 0,
      sales: 0,
      revenue: 0,
    };

    current.products += 1;
    current.revenue += Number(product.price || 0) * Number(product.stock || 0);
    counts.set(key, current);
  }

  for (const order of orders) {
    for (const item of order.items || []) {
      const product = products.find((entry) => String(entry._id) === String(item.productId));
      if (!product) {
        continue;
      }

      const key = product.categoryId ? String(product.categoryId) : product.category || "Uncategorized";
      const current = counts.get(key) || {
        name: product.category || "Uncategorized",
        products: 0,
        sales: 0,
        revenue: 0,
      };

      current.sales += Number(item.quantity || 0);
      current.revenue += Number(item.lineTotal || item.price * item.quantity || 0);
      counts.set(key, current);
    }
  }

  return {
    categories,
    analytics: Array.from(counts.entries()).map(([key, value]) => ({ categoryId: key, ...value })),
    pagination: buildMeta({ page: 1, limit: Math.max(1, counts.size || 1), total: categories.length }),
  };
}

export async function createCategory(userId, input) {
  await dbConnect();
  const payload = categorySchema.parse({ ...input, userId });
  const slug = slugify(payload.name);

  const existing = await Category.findOne({
    userId,
    $or: [{ slug }, { name: payload.name }],
  }).lean();

  if (existing) {
    throw new Error("Category already exists");
  }

  return Category.create({
    userId,
    name: payload.name,
    slug,
    description: payload.description || "",
  });
}

export async function updateCategory(userId, categoryId, input) {
  await dbConnect();
  const payload = categorySchema.partial().parse(input);
  const category = await Category.findOne({ _id: categoryId, userId });

  if (!category) {
    throw new Error("Category not found");
  }

  if (payload.name) {
    const slug = slugify(payload.name);
    const duplicate = await Category.findOne({
      userId,
      _id: { $ne: categoryId },
      $or: [{ slug }, { name: payload.name }],
    }).lean();

    if (duplicate) {
      throw new Error("Category already exists");
    }

    category.name = payload.name;
    category.slug = slug;
  }

  if (typeof payload.description === "string") {
    category.description = payload.description;
  }

  await category.save();
  return category;
}

export async function upsertCategoryFromName(userId, categoryName) {
  await dbConnect();
  const name = String(categoryName || "Uncategorized").trim() || "Uncategorized";
  const slug = slugify(name);

  return Category.findOneAndUpdate(
    { userId, slug },
    { $setOnInsert: { userId, name, slug } },
    { upsert: true, returnDocument: "after" }
  );
}

export async function deleteCategory(userId, categoryId) {
  await dbConnect();
  const productCount = await Product.countDocuments({ userId, categoryId });
  if (productCount > 0) {
    throw new Error("Move or update the products in this category before deleting it");
  }

  return Category.deleteOne({ _id: categoryId, userId });
}
