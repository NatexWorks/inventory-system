// Settings schema stores workspace configuration for billing and inventory.
import mongoose from "mongoose";

const { Schema } = mongoose;

const settingsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    inventory: {
      lowStockThreshold: { type: Number, default: 5 },
      barcodeRules: { type: String, default: "Unique barcodes per sellable unit" },
      autoBarcodeGeneration: { type: Boolean, default: false },
      barcodeMode: { type: String, enum: ["optional", "strict"], default: "optional" },
    },
    store: {
      storeName: { type: String, trim: true, default: "", maxlength: 120 },
      storeEmail: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
      storeAddress: { type: String, trim: true, default: "", maxlength: 500 },
    },
    notifications: {
      lowStockAlerts: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      weeklySummary: { type: Boolean, default: true },
    },
    billing: {
      invoiceEnabled: { type: Boolean, default: true },
      taxPercentage: { type: Number, default: 0 },
      invoiceFormat: { type: String, enum: ["simple", "detailed", "thermal"], default: "simple" },
    },
    system: {
      offlineMode: { type: Boolean, default: true },
      sessionTimeoutMinutes: { type: Number, default: 30 },
      tokenExpirationDays: { type: Number, min: 1, max: 30, default: 30 },
      tokenExpirationPolicyVersion: { type: Number, default: 1, min: 1 },
    },
  },
  { timestamps: true }
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema, "settings");

export default Settings;
