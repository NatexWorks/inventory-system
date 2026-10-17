import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

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
    const suppliersCollection = db.collection("suppliers");
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

    const sampleSuppliers = [
      { name: "Tech World Distributors", contact: "+91 98765 43210", email: "sales@techworld.example", address: "Nehru Place, New Delhi", products: 25, rating: 4.9, status: "Active" },
      { name: "Global Electronics Co.", contact: "+91 98123 45678", email: "orders@globalelec.example", address: "Sector 18, Noida", products: 18, rating: 4.7, status: "Active" },
      { name: "Office Furnish Hub", contact: "+91 98987 65432", email: "support@officefurnish.example", address: "Kirti Nagar, New Delhi", products: 12, rating: 4.5, status: "Pending" },
      { name: "AccessPoint Supplies", contact: "+91 90000 11223", email: "hello@accesspoint.example", address: "Indirapuram, Ghaziabad", products: 30, rating: 4.8, status: "Active" },
      { name: "Metro Office Mart", contact: "+91 98111 22001", email: "orders@metroofficemart.example", address: "Lajpat Nagar, New Delhi", products: 42, rating: 4.6, status: "Active" },
      { name: "Northstar Computing", contact: "+91 98222 33002", email: "sales@northstar.example", address: "Sector 63, Noida", products: 35, rating: 4.8, status: "Active" },
      { name: "Daily Needs Wholesale", contact: "+91 98333 44003", email: "supply@dailyneeds.example", address: "Sahibabad, Ghaziabad", products: 60, rating: 4.4, status: "Active" },
      { name: "Modern Living Traders", contact: "+91 98444 55004", email: "hello@modernliving.example", address: "Vaishali, Ghaziabad", products: 22, rating: 4.3, status: "Pending" },
      { name: "Prime Stationery House", contact: "+91 98555 66005", email: "orders@primestationery.example", address: "Chandni Chowk, New Delhi", products: 48, rating: 4.7, status: "Active" },
      { name: "Urban Home Supplies", contact: "+91 98666 77006", email: "sales@urbanhome.example", address: "Crossings Republik, Ghaziabad", products: 19, rating: 4.2, status: "Inactive" },
      { name: "Smart Accessories Depot", contact: "+91 98777 88007", email: "support@smartaccessories.example", address: "Raj Nagar, Ghaziabad", products: 31, rating: 4.6, status: "Active" },
      { name: "Value Pack Distributors", contact: "+91 98888 99008", email: "orders@valuepack.example", address: "Okhla Industrial Area, New Delhi", products: 55, rating: 4.5, status: "Active" },
    ];
    for (const supplier of sampleSuppliers) {
      await suppliersCollection.updateOne(
        { userId: user._id, name: supplier.name },
        { $setOnInsert: { ...supplier, userId: user._id, createdAt: now, updatedAt: now } },
        { upsert: true }
      );
    }

    const categories = {
      electronics: await upsertCategory(categoriesCollection, user._id, "Electronics", "Laptops, gadgets, and accessories"),
      office: await upsertCategory(categoriesCollection, user._id, "Office Supplies", "Daily store and workstation essentials"),
      groceries: await upsertCategory(categoriesCollection, user._id, "Groceries", "Fast-moving consumer items"),
      furniture: await upsertCategory(categoriesCollection, user._id, "Furniture", "Chairs, desks, and storage"),
      accessories: await upsertCategory(categoriesCollection, user._id, "Accessories", "Everyday electronics and device accessories"),
      home: await upsertCategory(categoriesCollection, user._id, "Home Essentials", "Useful products for home and kitchen"),
      personalCare: await upsertCategory(categoriesCollection, user._id, "Personal Care", "Personal care and hygiene essentials"),
      packaging: await upsertCategory(categoriesCollection, user._id, "Packaging", "Packing, shipping, and storage materials"),
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


    const extraProductInputs = [
  {
    "category": "electronics",
    "name": "AeroBook Lite 15",
    "sku": "APL-LITE-15",
    "price": 58999,
    "costPrice": 49200,
    "stock": 11,
    "description": "Affordable laptop for daily office work."
  },
  {
    "category": "electronics",
    "name": "Nova Android Tablet 10",
    "sku": "TAB-NOVA-10",
    "price": 18999,
    "costPrice": 15100,
    "stock": 14,
    "description": "10-inch tablet for business and media."
  },
  {
    "category": "electronics",
    "name": "USB-C Hub 7-in-1",
    "sku": "ACC-HUB-07",
    "price": 2499,
    "costPrice": 1350,
    "stock": 27,
    "description": "Multiport USB-C hub for modern laptops."
  },
  {
    "category": "electronics",
    "name": "Mechanical Keyboard TKL",
    "sku": "KEY-MECH-TKL",
    "price": 4299,
    "costPrice": 2900,
    "stock": 9,
    "description": "Compact mechanical keyboard for workstations."
  },
  {
    "category": "electronics",
    "name": "1080p Webcam Pro",
    "sku": "CAM-WEB-1080",
    "price": 3299,
    "costPrice": 2200,
    "stock": 13,
    "description": "Full HD webcam for video meetings."
  },
  {
    "category": "electronics",
    "name": "Bluetooth Speaker Mini",
    "sku": "SPK-BT-MINI",
    "price": 1799,
    "costPrice": 980,
    "stock": 18,
    "description": "Portable wireless speaker."
  },
  {
    "category": "electronics",
    "name": "Wi-Fi Router AX1800",
    "sku": "NET-AX1800",
    "price": 4999,
    "costPrice": 3600,
    "stock": 7,
    "description": "Dual-band router for small offices."
  },
  {
    "category": "electronics",
    "name": "Portable SSD 1TB",
    "sku": "SSD-PORT-1TB",
    "price": 8999,
    "costPrice": 7100,
    "stock": 6,
    "description": "Fast portable storage for backups."
  },
  {
    "category": "accessories",
    "name": "Laptop Sleeve 14-inch",
    "sku": "ACC-SLEEVE-14",
    "price": 999,
    "costPrice": 420,
    "stock": 31,
    "description": "Padded sleeve for everyday laptop protection."
  },
  {
    "category": "accessories",
    "name": "USB-C Fast Charger 65W",
    "sku": "ACC-CHG-65W",
    "price": 2199,
    "costPrice": 1290,
    "stock": 22,
    "description": "Compact 65W USB-C power adapter."
  },
  {
    "category": "accessories",
    "name": "Braided USB-C Cable",
    "sku": "ACC-CABLE-USBC",
    "price": 399,
    "costPrice": 120,
    "stock": 64,
    "description": "Durable 1.5 metre charging cable."
  },
  {
    "category": "accessories",
    "name": "Wireless Presenter Remote",
    "sku": "ACC-PRES-01",
    "price": 1499,
    "costPrice": 760,
    "stock": 15,
    "description": "Presentation remote with laser pointer."
  },
  {
    "category": "accessories",
    "name": "Surge Protector 6 Socket",
    "sku": "ACC-SURGE-06",
    "price": 1299,
    "costPrice": 690,
    "stock": 19,
    "description": "Six-socket surge-protected extension board."
  },
  {
    "category": "office",
    "name": "A4 Copier Paper Ream",
    "sku": "OFF-PAPER-A4",
    "price": 329,
    "costPrice": 245,
    "stock": 73,
    "description": "500-sheet A4 copier paper ream."
  },
  {
    "category": "office",
    "name": "Whiteboard Marker Set",
    "sku": "OFF-MARK-04",
    "price": 199,
    "costPrice": 80,
    "stock": 48,
    "description": "Four-colour whiteboard marker pack."
  },
  {
    "category": "office",
    "name": "Desk Organizer Tray",
    "sku": "OFF-ORG-TRAY",
    "price": 549,
    "costPrice": 260,
    "stock": 16,
    "description": "Multi-compartment desk organizer."
  },
  {
    "category": "office",
    "name": "Sticky Notes Assorted",
    "sku": "OFF-STICKY-06",
    "price": 149,
    "costPrice": 55,
    "stock": 85,
    "description": "Assorted sticky notes for office reminders."
  },
  {
    "category": "office",
    "name": "Lever Arch File Pack",
    "sku": "OFF-FILE-05",
    "price": 449,
    "costPrice": 230,
    "stock": 37,
    "description": "Five-piece document file pack."
  },
  {
    "category": "groceries",
    "name": "Premium Green Tea Box",
    "sku": "GRC-TEA-GREEN",
    "price": 279,
    "costPrice": 175,
    "stock": 25,
    "description": "Green tea bags for retail shelves."
  },
  {
    "category": "groceries",
    "name": "Arabica Coffee Beans 500g",
    "sku": "GRC-COFFEE-500",
    "price": 699,
    "costPrice": 490,
    "stock": 8,
    "description": "Medium roast arabica coffee beans."
  },
  {
    "category": "groceries",
    "name": "Oats Family Pack",
    "sku": "GRC-OATS-1KG",
    "price": 199,
    "costPrice": 132,
    "stock": 42,
    "description": "One-kilogram rolled oats pack."
  },
  {
    "category": "groceries",
    "name": "Dry Fruit Mix 250g",
    "sku": "GRC-DRYFRUIT-250",
    "price": 399,
    "costPrice": 285,
    "stock": 17,
    "description": "Mixed nuts and dried fruit snack pack."
  },
  {
    "category": "groceries",
    "name": "Mineral Water Case",
    "sku": "GRC-WATER-CASE",
    "price": 240,
    "costPrice": 168,
    "stock": 5,
    "description": "Case of packaged drinking water bottles."
  },
  {
    "category": "furniture",
    "name": "Adjustable Laptop Stand",
    "sku": "FUR-STAND-01",
    "price": 1799,
    "costPrice": 1050,
    "stock": 12,
    "description": "Height-adjustable aluminium laptop stand."
  },
  {
    "category": "furniture",
    "name": "Ergonomic Foot Rest",
    "sku": "FUR-FOOT-01",
    "price": 1299,
    "costPrice": 760,
    "stock": 10,
    "description": "Foot rest for seated office work."
  },
  {
    "category": "furniture",
    "name": "Three Drawer Cabinet",
    "sku": "FUR-CAB-03",
    "price": 5999,
    "costPrice": 4500,
    "stock": 3,
    "description": "Compact office storage cabinet."
  },
  {
    "category": "home",
    "name": "Stainless Steel Bottle 1L",
    "sku": "HOME-BOTTLE-1L",
    "price": 499,
    "costPrice": 220,
    "stock": 33,
    "description": "Reusable stainless steel water bottle."
  },
  {
    "category": "home",
    "name": "Insulated Lunch Box",
    "sku": "HOME-LUNCH-02",
    "price": 799,
    "costPrice": 430,
    "stock": 21,
    "description": "Two-compartment insulated lunch box."
  },
  {
    "category": "home",
    "name": "LED Desk Lamp",
    "sku": "HOME-LAMP-LED",
    "price": 1199,
    "costPrice": 720,
    "stock": 14,
    "description": "Adjustable LED lamp for desk lighting."
  },
  {
    "category": "home",
    "name": "Microfiber Cleaning Cloths",
    "sku": "HOME-CLOTH-06",
    "price": 249,
    "costPrice": 90,
    "stock": 56,
    "description": "Six-piece microfiber cleaning cloth set."
  },
  {
    "category": "personalCare",
    "name": "Hand Wash Refill 750ml",
    "sku": "CARE-HANDWASH-750",
    "price": 179,
    "costPrice": 105,
    "stock": 29,
    "description": "Liquid hand wash refill pouch."
  },
  {
    "category": "personalCare",
    "name": "Hand Sanitizer 500ml",
    "sku": "CARE-SANITIZER-500",
    "price": 199,
    "costPrice": 118,
    "stock": 24,
    "description": "Alcohol-based hand sanitizer bottle."
  },
  {
    "category": "personalCare",
    "name": "Tissue Box Pack",
    "sku": "CARE-TISSUE-03",
    "price": 159,
    "costPrice": 84,
    "stock": 44,
    "description": "Three-box facial tissue pack."
  },
  {
    "category": "packaging",
    "name": "Corrugated Shipping Boxes",
    "sku": "PKG-BOX-MIX",
    "price": 599,
    "costPrice": 350,
    "stock": 32,
    "description": "Assorted medium shipping boxes."
  },
  {
    "category": "packaging",
    "name": "Bubble Wrap Roll",
    "sku": "PKG-BUBBLE-10M",
    "price": 349,
    "costPrice": 190,
    "stock": 18,
    "description": "Protective bubble wrap roll."
  },
  {
    "category": "packaging",
    "name": "Packing Tape 6-Pack",
    "sku": "PKG-TAPE-06",
    "price": 299,
    "costPrice": 145,
    "stock": 39,
    "description": "Clear packing tape rolls for dispatch."
  },
  {
    "category": "packaging",
    "name": "Thermal Label Roll",
    "sku": "PKG-LABEL-01",
    "price": 449,
    "costPrice": 260,
    "stock": 26,
    "description": "Thermal label roll for shipping labels."
  }
];
    for (const input of extraProductInputs) {
      const product = await upsertProduct(productsCollection, user._id, categories[input.category], input);
      products[input.sku] = product;
    }

    const productList = Object.values(products);
    const demoCustomers = [
      ["Aarav Sharma", "9876500101"], ["Meera Verma", "9876500102"],
      ["Kabir Singh", "9876500103"], ["Ananya Gupta", "9876500104"],
      ["Ishaan Patel", "9876500105"], ["Sana Khan", "9876500106"],
      ["Rohan Mehta", "9876500107"], ["Diya Joshi", "9876500108"],
      ["Arjun Malhotra", "9876500109"], ["Aditi Rao", "9876500110"],
      ["Walk-in Customer", ""], ["City Office Solutions", "9876500112"],
      ["Bright Future Academy", "9876500113"], ["Green Basket Retail", "9876500114"],
      ["Urban Desk Studio", "9876500115"], ["QuickShip Services", "9876500116"],
    ];
    const orders = [];
    for (let index = 0; index < 40; index += 1) {
      const first = productList[(index * 3) % productList.length];
      const second = productList[(index * 7 + 5) % productList.length];
      const third = productList[(index * 11 + 2) % productList.length];
      const selected = [first, second, third].filter((product, position, all) =>
        all.findIndex((candidate) => String(candidate._id) === String(product._id)) === position
      );
      const items = selected.map((product, itemIndex) => {
        const quantity = 1 + ((index + itemIndex * 2) % 5);
        const price = Number(product.price);
        return { productId: product._id, name: product.name, quantity, price, lineTotal: price * quantity };
      });
      const [customerName, customerPhone] = demoCustomers[index % demoCustomers.length];
      const status = index % 13 === 0 ? "CANCELLED" : index % 9 === 0 ? "PENDING_APPROVAL" : index % 7 === 0 ? "DRAFT" : "COMPLETED";
      const orderDate = new Date(now.getTime() - (index * 24 * 60 * 60 * 1000) - ((index % 6) * 60 * 60 * 1000));
      const totals = buildOrderTotals(items, 0.18, index % 4 === 0 ? 100 : 0);
      orders.push({
        userId: user._id,
        orderNumber: `INV-DEMO-${1001 + index}`,
        customerName,
        customerPhone,
        status,
        items,
        ...totals,
        approvedAt: status === "COMPLETED" ? orderDate : null,
        approvedBy: status === "COMPLETED" ? user._id : null,
        notes: `Sample demo order ${index + 1} for inventory dashboard and reports.`,
        createdAt: orderDate,
        updatedAt: orderDate,
      });
    }

    for (const order of orders) {
      await ordersCollection.updateOne(
        { userId: user._id, orderNumber: order.orderNumber },
        { $setOnInsert: { ...order, createdAt: order.createdAt || now, updatedAt: order.updatedAt || now, sessionId: null } },
        { upsert: true }
      );
    }

    console.log(JSON.stringify({
      demoEmail: DEMO_EMAIL,
      demoPassword: DEMO_PASSWORD,
      userId: String(user._id),
      categories: Object.keys(categories).length,
      products: productList.length,
      suppliers: sampleSuppliers.length,
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
