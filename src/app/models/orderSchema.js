// Order schema stores checkout, approval, and return data.
import mongoose from "mongoose";

const { Schema } = mongoose;

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    barcodeId: { type: Schema.Types.ObjectId, ref: "Barcode", default: null, index: true },
    barcode: { type: String, trim: true, default: "" },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", default: null, index: true },
    orderNumber: { type: String, required: true, trim: true },
    customerName: { type: String, default: "Walk-in Customer", trim: true },
    customerPhone: { type: String, default: "", trim: true },
    status: { type: String, enum: ["DRAFT", "PENDING_APPROVAL", "COMPLETED", "CANCELLED"], default: "DRAFT", index: true },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    isReturn: { type: Boolean, default: false },
    originalOrderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ userId: 1, status: 1 });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema, "orders");

export default Order;
