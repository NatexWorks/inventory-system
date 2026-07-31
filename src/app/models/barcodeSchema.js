// Barcode schema stores the lifecycle state for each scannable code.
import mongoose from "mongoose";

const { Schema } = mongoose;

const barcodeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    code: { type: String, required: true, trim: true, index: true },
    state: { type: String, enum: ["AVAILABLE", "RESERVED", "SOLD", "RETURNED"], default: "AVAILABLE", index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", default: null, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    reservedAt: { type: Date, default: null },
    soldAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

barcodeSchema.index({ userId: 1, code: 1 }, { unique: true });

const Barcode = mongoose.models.Barcode || mongoose.model("Barcode", barcodeSchema, "barcodes");

export default Barcode;
