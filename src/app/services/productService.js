// Product service handles catalog listing, creation, updates, and barcode sync.
import dbConnect from "../lib/db";
import Product from "../models/productSchema";
import Barcode from "../models/barcodeSchema";
import { buildMeta, sanitizeSearch } from "../lib/apiHelpers";
import { BARCODE_STATES } from "../lib/stateMachine";
import { productSchema } from "../lib/validation";
import { upsertCategoryFromName } from "./categoryService";
import { getSettings } from "./settingsService";
import crypto from "node:crypto";

let productIndexSyncPromise = null;

async function ensureProductIndexes() {
  if (!productIndexSyncPromise) {
    productIndexSyncPromise = Product.syncIndexes().catch((error) => {
      productIndexSyncPromise = null;
      throw error;
    });
  }

  return productIndexSyncPromise;
}

function normalizeBarcodes(barcodes = []) {
  return Array.from(
    new Map(
      barcodes
        .filter(Boolean)
        .map((item) => [String(item.code || "").trim(), { code: String(item.code || "").trim(), state: item.state || BARCODE_STATES.AVAILABLE }])
        .filter(([code]) => Boolean(code))
    ).values()
  );
}

function createBarcodeCode(prefix = "BC") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function generateUniqueBarcodes(userId, count, prefix = "BC") {
  const generated = [];
  const seen = new Set();

  while (generated.length < count) {
    const code = createBarcodeCode(prefix);
    if (seen.has(code)) {
      continue;
    }

    const exists = await Barcode.findOne({ userId, code }).lean();
    if (exists) {
      continue;
    }

    seen.add(code);
    generated.push({ code, state: BARCODE_STATES.AVAILABLE });
  }

  return generated;
}

async function syncBarcodes(userId, productId, barcodes = [], { autoGenerate = false, stock = 0 } = {}) {
  const normalized = normalizeBarcodes(barcodes);
  const desiredCount = Number(stock || 0);

  if (normalized.length > desiredCount) {
    throw new Error("Assigned barcodes cannot exceed stock quantity");
  }

  let resolved = normalized;
  if (autoGenerate && desiredCount > normalized.length) {
    const generated = await generateUniqueBarcodes(userId, desiredCount - normalized.length);
    resolved = [...normalized, ...generated];
  }

  const activeCodes = resolved.map((item) => item.code);

  if (activeCodes.length) {
    const existing = await Barcode.find({ userId, code: { $in: activeCodes } }).lean();
    for (const barcode of existing) {
      if (String(barcode.productId) !== String(productId)) {
        const owner = await Product.findById(barcode.productId).lean();
        throw new Error(`Barcode ${barcode.code} already belongs to ${owner?.name || "another product"}`);
      }
    }
  }

  for (const item of resolved) {
    await Barcode.findOneAndUpdate(
      { userId, code: item.code },
      {
        $setOnInsert: {
          userId,
          productId,
          code: item.code,
        },
        $set: {
          state: item.state || BARCODE_STATES.AVAILABLE,
        },
      },
      { upsert: true,returnDocument:"after" }
    );
  }

  return resolved;
}

async function assertBarcodePolicy(userId) {
  const settings = await getSettings(userId);
  return settings?.inventory?.barcodeMode || "optional";
}

export async function listProducts(userId, { page = 1, limit = 10, search = "" } = {}) {
  await dbConnect();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
  const regex = search ? { $regex: sanitizeSearch(search), $options: "i" } : null;
  const barcodeMatches = search
    ? await Barcode.distinct("productId", { userId, code: regex })
    : [];

  const filter = {
    userId,
    ...(regex
      ? {
          $or: [
            { name: regex },
            { description: regex },
            { category: regex },
            { sku: regex },
            ...(barcodeMatches.length ? [{ _id: { $in: barcodeMatches } }] : []),
          ],
        }
      : {}),
  };

  const [products, totalProducts] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: buildMeta({ page: safePage, limit: safeLimit, total: totalProducts }),
  };
}

export async function getProductById(userId, id) {
  await dbConnect();
  return Product.findOne({ _id: id, userId }).lean();
}

export async function createProduct(userId, input) {
  await dbConnect();
  await ensureProductIndexes();
  const payload = productSchema.parse({ ...input, userId });
  await assertBarcodePolicy(userId, payload.barcodes || []);
  const category = payload.categoryId
    ? null
    : await upsertCategoryFromName(userId, payload.category);
  const sku = payload.sku?.trim() || undefined;

  const product = await Product.create({
    userId,
    categoryId: payload.categoryId || category?._id || null,
    category: payload.category || category?.name || "Uncategorized",
    name: payload.name,
    price: payload.price,
    costPrice: payload.costPrice || 0,
    stock: payload.stock,
    ...(sku ? { sku } : {}),
    description: payload.description || "",
    barcodes: payload.barcodes || [],
  });

  const assigned = await syncBarcodes(userId, product._id, payload.barcodes || [], {
    stock: payload.stock,
  });
  product.barcodes = assigned;
  if (assigned.length) {
    await product.save();
  }

  return product;
}

export async function updateProduct(userId, id, input) {
  await dbConnect();
  await ensureProductIndexes();
  const payload = productSchema.partial().parse(input);
  const existing = await Product.findOne({ _id: id, userId }).lean();
  if (!existing) {
    throw new Error("Product not found");
  }

  const nextBarcodes = payload.barcodes || existing.barcodes || [];
  await assertBarcodePolicy(userId, nextBarcodes);

  const nextStock = payload.stock ?? existing.stock ?? 0;
  const existingAssigned = Array.isArray(existing.barcodes) ? existing.barcodes.length : 0;

  if (nextStock < existingAssigned && !payload.barcodes?.length) {
    throw new Error("Stock cannot be lower than the number of assigned barcodes");
  }

  const update = { ...payload };
  if (Object.prototype.hasOwnProperty.call(payload, "sku")) {
    const sku = payload.sku?.trim() || undefined;
    if (sku) {
      update.sku = sku;
    } else {
      delete update.sku;
    }
  }
  if (payload.category && !payload.categoryId) {
    const category = await upsertCategoryFromName(userId, payload.category);
    update.categoryId = category?._id || null;
  }

  const product = await Product.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { returnDocument: "after", runValidators: true }
  );

  if (!product) {
    throw new Error("Product not found");
  }

  if (payload.barcodes) {
    const assigned = await syncBarcodes(userId, product._id, payload.barcodes || existing.barcodes || [], {
      stock: product.stock,
    });
    product.barcodes = assigned;
    await product.save();
  }

  return product;
}

export async function deleteProduct(userId, id) {
  await dbConnect();
  await Barcode.deleteMany({ userId, productId: id });
  return Product.deleteOne({ _id: id, userId });
}

export async function searchProductByBarcode(userId, code) {
  await dbConnect();
  const barcode = await Barcode.findOne({ userId, code }).populate("productId").lean();
  if (!barcode) {
    return null;
  }
  return barcode;
}
