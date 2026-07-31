import mongoose from "mongoose";

process.env.MONGODB_URI ||= "mongodb://localhost:27017/inventoryDB";

const { default: dbConnect } = await import("../src/app/lib/db.js");
const { default: User } = await import("../src/app/models/userSchema.js");
const { default: Category } = await import("../src/app/models/categorySchema.js");
const { default: Product } = await import("../src/app/models/productSchema.js");
const { default: Order } = await import("../src/app/models/orderSchema.js");
const { default: Settings } = await import("../src/app/models/settingsSchema.js");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildOrderTotals(items, taxRate = 0, discountAmount = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const totalAmount = subtotal + taxAmount - discountAmount;

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
  };
}

async function upsertCategory(userId, name, description = "") {
  const slug = slugify(name);
  return Category.findOneAndUpdate(
    { userId, slug },
    {
      $setOnInsert: {
        userId,
        name,
        slug,
        description,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
}

async function upsertProduct(userId, category, input) {
  const sku = input.sku || undefined;
  const query = sku ? { userId, sku } : { userId, name: input.name };
  const update = {
    userId,
    categoryId: category._id,
    category: category.name,
    name: input.name,
    price: input.price,
    costPrice: input.costPrice,
    stock: input.stock,
    description: input.description,
    isActive: true,
    barcodeMode: "PRODUCT",
  };

  if (sku) {
    update.sku = sku;
  }

  return Product.findOneAndUpdate(
    query,
    { $setOnInsert: update },
    { upsert: true, returnDocument: "after" }
  );
}

async function main() {
  await dbConnect();

  const user = await User.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  if (!user) {
    throw new Error("No active user found to attach demo data");
  }

  await Settings.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        inventory: {
          lowStockThreshold: 5,
          barcodeRules: "Unique barcodes per sellable unit",
          autoBarcodeGeneration: false,
          barcodeMode: "optional",
        },
        billing: {
          invoiceEnabled: true,
          taxPercentage: 18,
          invoiceFormat: "detailed",
        },
        system: {
          offlineMode: true,
          sessionTimeoutMinutes: 30,
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  const categories = {
    electronics: await upsertCategory(user._id, "Electronics", "Laptops, gadgets, and accessories"),
    office: await upsertCategory(user._id, "Office Supplies", "Daily store and workstation essentials"),
    groceries: await upsertCategory(user._id, "Groceries", "Fast-moving consumer items"),
    furniture: await upsertCategory(user._id, "Furniture", "Chairs, desks, and storage"),
  };

  const products = {
    laptop: await upsertProduct(user._id, categories.electronics, {
      name: "ApexBook Pro 14",
      sku: "APL-14-PRO",
      price: 72999,
      costPrice: 61000,
      stock: 8,
      description: "14-inch productivity laptop with fast SSD storage.",
    }),
    mouse: await upsertProduct(user._id, categories.electronics, {
      name: "Swift Wireless Mouse",
      sku: "MSE-SWIFT-01",
      price: 1499,
      costPrice: 900,
      stock: 24,
      description: "Compact mouse with silent clicks and Bluetooth support.",
    }),
    notebooks: await upsertProduct(user._id, categories.office, {
      name: "Executive Notebooks Pack",
      sku: "OFF-NOTE-10",
      price: 399,
      costPrice: 180,
      stock: 40,
      description: "Pack of premium ruled notebooks for office use.",
    }),
    pen: await upsertProduct(user._id, categories.office, {
      name: "Smooth Glide Pen Set",
      sku: "OFF-PEN-08",
      price: 249,
      costPrice: 90,
      stock: 58,
      description: "Blue and black ball pen combo pack.",
    }),
    snacks: await upsertProduct(user._id, categories.groceries, {
      name: "Assorted Snack Box",
      sku: "GRC-SNACK-01",
      price: 599,
      costPrice: 420,
      stock: 16,
      description: "Mixed snack assortment for quick resale.",
    }),
    biscuits: await upsertProduct(user._id, categories.groceries, {
      name: "Tea Time Biscuits Carton",
      sku: "GRC-BISC-12",
      price: 899,
      costPrice: 650,
      stock: 12,
      description: "Carton of assorted premium biscuits.",
    }),
    chair: await upsertProduct(user._id, categories.furniture, {
      name: "Ergo Desk Chair",
      sku: "FUR-ERGO-01",
      price: 8999,
      costPrice: 7200,
      stock: 6,
      description: "Comfort-focused chair for office setups.",
    }),
    shelf: await upsertProduct(user._id, categories.furniture, {
      name: "Steel Storage Shelf",
      sku: "FUR-SHELF-02",
      price: 6499,
      costPrice: 5100,
      stock: 4,
      description: "Durable storage shelf for inventory rooms.",
    }),
  };

  const orderOneItems = [
    {
      productId: products.laptop._id,
      name: products.laptop.name,
      quantity: 1,
      price: Number(products.laptop.price),
      lineTotal: Number(products.laptop.price),
    },
    {
      productId: products.mouse._id,
      name: products.mouse.name,
      quantity: 2,
      price: Number(products.mouse.price),
      lineTotal: Number(products.mouse.price) * 2,
    },
  ];

  const orderTwoItems = [
    {
      productId: products.notebooks._id,
      name: products.notebooks.name,
      quantity: 5,
      price: Number(products.notebooks.price),
      lineTotal: Number(products.notebooks.price) * 5,
    },
    {
      productId: products.snacks._id,
      name: products.snacks.name,
      quantity: 3,
      price: Number(products.snacks.price),
      lineTotal: Number(products.snacks.price) * 3,
    },
  ];

  const orderOneTotals = buildOrderTotals(orderOneItems, 0.18, 500);
  await Order.findOneAndUpdate(
    { userId: user._id, orderNumber: "INV-DEMO-1001" },
    {
      $setOnInsert: {
        userId: user._id,
        orderNumber: "INV-DEMO-1001",
        customerName: "Walk-in Customer",
        customerPhone: "",
        status: "COMPLETED",
        items: orderOneItems,
        ...orderOneTotals,
        approvedAt: new Date(),
        notes: "Seeded demo order.",
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  const orderTwoTotals = buildOrderTotals(orderTwoItems, 0.18, 0);
  await Order.findOneAndUpdate(
    { userId: user._id, orderNumber: "INV-DEMO-1002" },
    {
      $setOnInsert: {
        userId: user._id,
        orderNumber: "INV-DEMO-1002",
        customerName: "Office Supplies Desk",
        customerPhone: "",
        status: "COMPLETED",
        items: orderTwoItems,
        ...orderTwoTotals,
        approvedAt: new Date(),
        notes: "Seeded demo order.",
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  const summary = {
    user: String(user._id),
    categories: Object.keys(categories).length,
    products: Object.keys(products).length,
    orders: 2,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
