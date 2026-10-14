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

async function getBarcodePolicy(userId) {
  const settings = await getSettings(userId);
  return {
    mode: settings?.inventory?.barcodeMode || "optional",
    autoGenerate: Boolean(settings?.inventory?.autoBarcodeGeneration),
  };
}

function normalizedText(value) {
  return String(value || "").trim().replace(/\\s+/g, " ").toLocaleLowerCase();
}

function matchesExistingProduct(product, payload, categoryName, sku) {
  // Require the same identifying details before treating a repeated barcode as
  // a stock addition. In particular, don't merge different SKUs or pack sizes.
  return normalizedText(product.name) === normalizedText(payload.name)
    && normalizedText(product.category) === normalizedText(categoryName)
    && normalizedText(product.sku) === normalizedText(sku)
    && Number(product.price) === Number(payload.price);
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
  const policy = await getBarcodePolicy(userId);
  let barcodes = normalizeBarcodes(payload.barcodes || []);
  const sku = payload.sku?.trim() || undefined;
  const categoryName = payload.category || "Uncategorized";

  if (policy.mode === "strict" && barcodes.length === 0 && !policy.autoGenerate && payload.stock > 0) {
    throw new Error("A barcode is required while strict barcode mode is enabled");
  }

  // Respect the workspace setting: when automatic generation is enabled, a
  // product-level barcode is generated if the operator didn't scan one.
  if (barcodes.length === 0 && payload.stock > 0 && policy.autoGenerate) {
    barcodes = await generateUniqueBarcodes(userId, 1);
  }

  // Validate existing codes before creating a Product document. This prevents
  // an invalid/duplicate barcode from leaving an orphan product behind.
  const existingBarcodes = barcodes.length
    ? await Barcode.find({ userId, code: { $in: barcodes.map((item) => item.code) } }).lean()
    : [];
  const existingProductIds = [...new Set(existingBarcodes.map((item) => String(item.productId)))];

  if (existingProductIds.length > 0) {
    if (existingProductIds.length !== 1) {
      throw new Error("These barcodes belong to different products");
    }

    const existingProduct = await Product.findOne({
      _id: existingProductIds[0],
      userId,
    }).lean();
    if (!existingProduct || !matchesExistingProduct(existingProduct, payload, categoryName, sku)) {
      const conflict = existingBarcodes[0];
      throw new Error(`Barcode ${conflict.code} already belongs to a different product or variant`);
    }

    const product = await Product.findOneAndUpdate(
      { _id: existingProduct._id, userId },
      { $inc: { stock: payload.stock } },
      { returnDocument: "after", runValidators: true }
    );
    if (!product) {
      throw new Error("Product not found while updating stock");
    }

    const combinedBarcodes = normalizeBarcodes([
      ...(existingProduct.barcodes || []),
      ...barcodes,
    ]);
    const assigned = await syncBarcodes(userId, product._id, combinedBarcodes, {
      stock: product.stock,
    });
    product.barcodes = assigned;
    await product.save();
    return product;
  }

  const category = payload.categoryId
    ? null
    : await upsertCategoryFromName(userId, payload.category);
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
    barcodes,
  });

  const assigned = await syncBarcodes(userId, product._id, barcodes, {
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
  const policy = await getBarcodePolicy(userId);
  if (policy.mode === "strict" && nextBarcodes.length === 0 && !policy.autoGenerate) {
    throw new Error("A barcode is required while strict barcode mode is enabled");
  }

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

export async function addProductBarcodes(userId, id, inputBarcodes = []) {
  await dbConnect();

  const product = await Product.findOne({ _id: id, userId }).lean();
  if (!product) {
    throw new Error("Product not found");
  }

  const rawCodes = (Array.isArray(inputBarcodes) ? inputBarcodes : [])
    .map((item) => String(item?.code || "").trim())
    .filter(Boolean);
  if (rawCodes.length === 0) {
    throw new Error("Enter at least one barcode to add");
  }

  const seen = new Set();
  for (const code of rawCodes) {
    if (seen.has(code)) {
      throw new Error(`Barcode ${code} is entered more than once.`);
    }
    seen.add(code);
  }

  const existingProductCodes = new Set(
    (Array.isArray(product.barcodes) ? product.barcodes : [])
      .map((item) => String(item?.code || "").trim())
      .filter(Boolean)
  );
  for (const code of rawCodes) {
    if (existingProductCodes.has(code)) {
      throw new Error(`Barcode ${code} is already assigned to this product.`);
    }
  }

  if (product.barcodeMode === "UNIT") {
    const availableSlots = Math.max(0, Number(product.stock || 0) - existingProductCodes.size);
    if (rawCodes.length > availableSlots) {
      throw new Error(`Only ${availableSlots} unassigned stock barcode slot(s) remain.`);
    }
  }

  // Check ownership before writing anything so a conflicting code cannot
  // partially update the Product document.
  const existingRecords = await Barcode.find({
    userId,
    code: { $in: rawCodes },
  }).lean();

  if (existingRecords.length > 0) {
    const owners = new Map(existingRecords.map((item) => [item.code, String(item.productId)]));
    for (const code of rawCodes) {
      if (owners.has(code)) {
        throw new Error(
          owners.get(code) === String(product._id)
            ? `Barcode ${code} is already linked to this product.`
            : `Barcode ${code} already belongs to another product.`
        );
      }
    }
  }

  let createdBarcodes = [];
  try {
    createdBarcodes = await Barcode.insertMany(
      rawCodes.map((code) => ({
        userId,
        productId: product._id,
        code,
        state: BARCODE_STATES.AVAILABLE,
      })),
      { ordered: true }
    );

    const assignments = createdBarcodes.map((item) => ({
      code: item.code,
      state: item.state || BARCODE_STATES.AVAILABLE,
      barcodeId: item._id,
    }));

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: product._id, userId },
      { $push: { barcodes: { $each: assignments } } },
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedProduct) {
      throw new Error("Product could not be updated with the new barcodes");
    }

    return updatedProduct;
  } catch (error) {
    if (createdBarcodes.length > 0) {
      await Barcode.deleteMany({
        _id: { $in: createdBarcodes.map((item) => item._id) },
        userId,
        productId: product._id,
      }).catch(() => {});
    }
    throw error;
  }
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
