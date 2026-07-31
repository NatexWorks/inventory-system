// Return schema stores completed product return records.
import mongoose from "mongoose";

const { Schema } = mongoose;

const returnItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    barcodeId: { type: Schema.Types.ObjectId, ref: "Barcode", default: null, index: true },
    barcode: { type: String, trim: true, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const returnSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalOrderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    returnNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: ["COMPLETED", "CANCELLED"], default: "COMPLETED", index: true },
    items: [returnItemSchema],
    notes: { type: String, default: "" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

returnSchema.index({ userId: 1, returnNumber: 1 }, { unique: true });

const Return = mongoose.models.Return || mongoose.model("Return", returnSchema, "returns");

export default Return;
