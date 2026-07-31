// Product schema stores catalog items, stock, and barcode references.
import mongoose from "mongoose";

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    category: { type: String, required: true, trim: true, default: "Uncategorized", index: true },
    name: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: {
      type: String,
      trim: true,
      default: undefined,
      set: (value) => {
        const normalized = String(value || "").trim();
        return normalized || undefined;
      },
      index: true,
    },
    description: { type: String, default: "" },
    barcodeMode: { type: String, enum: ["UNIT", "PRODUCT"], default: "PRODUCT" },
    barcodes: [
      {
        code: { type: String, trim: true },
        state: { type: String, enum: ["AVAILABLE", "RESERVED", "SOLD", "RETURNED"], default: "AVAILABLE" },
        barcodeId: { type: Schema.Types.ObjectId, ref: "Barcode", default: null },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index(
  { userId: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sku: { $type: "string" },
    },
  }
);
productSchema.index({ userId: 1, name: 1 });
productSchema.index({ userId: 1, category: 1 });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema, "products");
export default Product;
