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
    billing: {
      invoiceEnabled: { type: Boolean, default: true },
      taxPercentage: { type: Number, default: 0 },
      invoiceFormat: { type: String, enum: ["simple", "detailed", "thermal"], default: "simple" },
    },
    system: {
      offlineMode: { type: Boolean, default: true },
      sessionTimeoutMinutes: { type: Number, default: 30 },
    },
  },
  { timestamps: true }
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema, "settings");

export default Settings;
