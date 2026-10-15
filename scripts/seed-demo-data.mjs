import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DEMO_EMAIL = "demo@inventory-system.test";
const DEMO_PASSWORD = "Demo@12345";

if (!MONGODB_URI) {
  throw new Error("Set MONGODB_URI to the intended database before running the demo seed script.");
}

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
  return { subtotal, taxAmount, discountAmount, totalAmount: subtotal + taxAmount - discountAmount };
}

async function upsertCategory(collection, userId, name, description = "") {
  const now = new Date();
  const slug = slugify(name);
  await collection.updateOne(
    { userId, slug },
    {
      $setOnInsert: {
        userId,
        name,
        slug,
        description,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );
  return collection.findOne({ userId, slug });
}

async function upsertProduct(collection, userId, category, input) {
  const now = new Date();
  const sku = input.sku || undefined;
  const filter = sku ? { userId, sku } : { userId, name: input.name };
  const document = {
    userId,
    categoryId: category._id,
    category: category.name,
    name: input.name,
    price: input.price,
    costPrice: input.costPrice,
    stock: input.stock,
    ...(sku ? { sku } : {}),
    description: input.description,
    barcodeMode: "PRODUCT",
    barcodes: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await collection.updateOne(filter, { $setOnInsert: document }, { upsert: true });
  return collection.findOne(filter);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB_NAME || undefined);
    const users = db.collection("users");
    const categoriesCollection = db.collection("categories");
    const productsCollection = db.collection("products");
    const ordersCollection = db.collection("orders");
    const settingsCollection = db.collection("settings");
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    // Never attach sample data to an arbitrary customer. This dedicated account
    // is publicly documented and all authenticated write APIs reject it server-side.
    await users.updateOne(
      { email: DEMO_EMAIL },
      {
        $set: {
          name: "Inventory Demo Store",
          email: DEMO_EMAIL,
          passwordHash,
          role: "owner",
          isActive: true,
          isDemo: true,
          emailVerified: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
        $inc: { tokenVersion: 1 },
      },
      { upsert: true }
    );
    const user = await users.findOne({ email: DEMO_EMAIL });
    if (!user) throw new Error("Unable to create the isolated demo user.");

    await settingsCollection.updateOne(
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
          store: { storeName: "Inventory Demo Store", storeEmail: "", storeAddress: "" },
          notifications: { lowStockAlerts: true, orderUpdates: true, weeklySummary: true },
          billing: { invoiceEnabled: true, taxPercentage: 18, invoiceFormat: "detailed" },
          system: { offlineMode: true, sessionTimeoutMinutes: 30 },
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true }
    );

    const categories = {
      electronics: await upsertCategory(categoriesCollection, user._id, "Electronics", "Laptops, gadgets, and accessories"),
      office: await upsertCategory(categoriesCollection, user._id, "Office Supplies", "Daily store and workstation essentials"),
      groceries: await upsertCategory(categoriesCollection, user._id, "Groceries", "Fast-moving consumer items"),
      furniture: await upsertCategory(categoriesCollection, user._id, "Furniture", "Chairs, desks, and storage"),
    };

    const products = {
      laptop: await upsertProduct(productsCollection, user._id, categories.electronics, {
        name: "ApexBook Pro 14", sku: "APL-14-PRO", price: 72999, costPrice: 61000, stock: 8,
        description: "14-inch productivity laptop with fast SSD storage.",
      }),
      mouse: await upsertProduct(productsCollection, user._id, categories.electronics, {
        name: "Swift Wireless Mouse", sku: "MSE-SWIFT-01", price: 1499, costPrice: 900, stock: 24,
        description: "Compact mouse with silent clicks and Bluetooth support.",
      }),
      notebooks: await upsertProduct(productsCollection, user._id, categories.office, {
        name: "Executive Notebooks Pack", sku: "OFF-NOTE-10", price: 399, costPrice: 180, stock: 40,
        description: "Pack of premium ruled notebooks for office use.",
      }),
      pen: await upsertProduct(productsCollection, user._id, categories.office, {
        name: "Smooth Glide Pen Set", sku: "OFF-PEN-08", price: 249, costPrice: 90, stock: 58,
        description: "Blue and black ball pen combo pack.",
      }),
      snacks: await upsertProduct(productsCollection, user._id, categories.groceries, {
        name: "Assorted Snack Box", sku: "GRC-SNACK-01", price: 599, costPrice: 420, stock: 16,
        description: "Mixed snack assortment for quick resale.",
      }),
      biscuits: await upsertProduct(productsCollection, user._id, categories.groceries, {
        name: "Tea Time Biscuits Carton", sku: "GRC-BISC-12", price: 899, costPrice: 650, stock: 12,
        description: "Carton of assorted premium biscuits.",
      }),
      chair: await upsertProduct(productsCollection, user._id, categories.furniture, {
        name: "Ergo Desk Chair", sku: "FUR-ERGO-01", price: 8999, costPrice: 7200, stock: 6,
        description: "Comfort-focused chair for office setups.",
      }),
      shelf: await upsertProduct(productsCollection, user._id, categories.furniture, {
        name: "Steel Storage Shelf", sku: "FUR-SHELF-02", price: 6499, costPrice: 5100, stock: 4,
        description: "Durable storage shelf for inventory rooms.",
      }),
    };

    const orderOneItems = [
      { productId: products.laptop._id, name: products.laptop.name, quantity: 1, price: Number(products.laptop.price), lineTotal: Number(products.laptop.price) },
      { productId: products.mouse._id, name: products.mouse.name, quantity: 2, price: Number(products.mouse.price), lineTotal: Number(products.mouse.price) * 2 },
    ];
    const orderTwoItems = [
      { productId: products.notebooks._id, name: products.notebooks.name, quantity: 5, price: Number(products.notebooks.price), lineTotal: Number(products.notebooks.price) * 5 },
      { productId: products.snacks._id, name: products.snacks.name, quantity: 3, price: Number(products.snacks.price), lineTotal: Number(products.snacks.price) * 3 },
    ];

    const orders = [
      {
        userId: user._id,
        orderNumber: "INV-DEMO-1001",
        customerName: "Walk-in Customer",
        customerPhone: "",
        status: "COMPLETED",
        items: orderOneItems,
        ...buildOrderTotals(orderOneItems, 0.18, 500),
        approvedAt: now,
        approvedBy: user._id,
        notes: "Seeded demo order.",
      },
      {
        userId: user._id,
        orderNumber: "INV-DEMO-1002",
        customerName: "Office Supplies Desk",
        customerPhone: "",
        status: "COMPLETED",
        items: orderTwoItems,
        ...buildOrderTotals(orderTwoItems, 0.18, 0),
        approvedAt: now,
        approvedBy: user._id,
        notes: "Seeded demo order.",
      },
    ];

    for (const order of orders) {
      await ordersCollection.updateOne(
        { userId: user._id, orderNumber: order.orderNumber },
        { $setOnInsert: { ...order, createdAt: now, updatedAt: now, sessionId: null } },
        { upsert: true }
      );
    }

    console.log(JSON.stringify({
      demoEmail: DEMO_EMAIL,
      demoPassword: DEMO_PASSWORD,
      userId: String(user._id),
      categories: Object.keys(categories).length,
      products: Object.keys(products).length,
      orders: orders.length,
      note: "All sample records are scoped to the read-only demo account.",
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Demo seed failed:", error?.message || "unknown error");
  process.exitCode = 1;
});
