// Zod schemas that validate auth, product, order, session, and settings payloads.
import { z } from "zod";
import { BARCODE_STATES, ORDER_STATES, SESSION_STATES } from "./stateMachine";

const objectId = z.string().trim().min(1, "Invalid id");

// Auth and recovery forms validate against these schemas before reaching services.
export const authSignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["owner", "staff"]).default("owner"),
});

// Magic-link sign-up metadata is stored before the email link is sent.
export const magicLinkRequestSchema = z.object({
  name: z.string().trim().min(2).max(120).optional().default(""),
  email: z.string().trim().email(),
  role: z.enum(["owner", "staff"]).default("owner"),
});

export const authLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Product creation and updates share this schema.
export const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  price: z.coerce.number().positive(),
  costPrice: z.coerce.number().min(0).optional().default(0),
  stock: z.coerce.number().int().min(0),
  categoryId: objectId.optional().nullable(),
  category: z.string().trim().min(2).max(120).optional().default("Uncategorized"),
  description: z.string().trim().max(2000).optional().default(""),
  sku: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      }

      return value;
    },
    z.string().trim().max(80).optional().nullable()
  ),
  userId: objectId.optional(),
  barcodes: z.array(z.object({
    code: z.string().trim().min(1),
    state: z.enum(Object.keys(BARCODE_STATES)).default(BARCODE_STATES.AVAILABLE),
  })).optional(),
});

// Category payload validation used by category routes and services.
export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  userId: objectId.optional(),
});

// Barcode scanning payload validation.
export const barcodeScanSchema = z.object({
  barcode: z.string().trim().min(1),
  sessionId: z.string().trim().min(1).optional(),
});

// Session payload validation for POS and QR workflows.
export const sessionSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  deviceId: z.string().trim().min(1).optional(),
  userId: objectId.optional(),
  status: z.enum(Object.keys(SESSION_STATES)).optional(),
});

// Individual order item validation.
export const orderItemSchema = z.object({
  productId: objectId,
  barcodeId: objectId.optional().nullable(),
  barcode: z.string().trim().optional().default(""),
  name: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().min(0),
  lineTotal: z.coerce.number().min(0).optional(),
});

// Order validation including items and totals.
export const orderSchema = z.object({
  customerName: z.string().trim().min(1).max(120).optional().default("Walk-in Customer"),
  customerPhone: z.string().trim().max(20).optional().default(""),
  sessionId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(Object.keys(ORDER_STATES)).optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional().default(0),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  totalAmount: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional().default(""),
});

// Approval payload validation for order workflow transitions.
export const orderApproveSchema = z.object({
  approvedBy: objectId.optional().nullable(),
});

// Cancellation payload validation for orders.
export const orderCancelSchema = z.object({
  reason: z.string().trim().max(500).optional().default(""),
});

// Return payload validation for completed orders.
export const returnSchema = z.object({
  originalOrderId: objectId,
  notes: z.string().trim().max(1000).optional().default(""),
  items: z.array(
    z.object({
      productId: objectId,
      barcodeId: objectId.optional().nullable(),
      barcode: z.string().trim().optional().default(""),
      quantity: z.coerce.number().int().positive(),
      price: z.coerce.number().min(0).optional().default(0),
    })
  ).min(1),
});

// Workspace settings validation used by the settings route and service.
export const settingsSchema = z.object({
  inventory: z.object({
    lowStockThreshold: z.coerce.number().int().min(0).default(5),
    barcodeRules: z.string().trim().max(500).optional().default("Unique barcodes per sellable unit"),
    autoBarcodeGeneration: z.boolean().default(false),
    barcodeMode: z.enum(["optional", "strict"]).default("optional"),
  }).default({}),
  billing: z.object({
    invoiceEnabled: z.boolean().default(true),
    taxPercentage: z.coerce.number().min(0).max(100).default(0),
    invoiceFormat: z.enum(["simple", "detailed", "thermal"]).default("simple"),
  }).default({}),
  system: z.object({
    offlineMode: z.boolean().default(true),
    sessionTimeoutMinutes: z.coerce.number().int().min(5).default(30),
  }).default({}),
});
