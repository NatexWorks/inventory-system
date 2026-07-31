// Session schema stores QR/session-based billing state.
import mongoose from "mongoose";

const { Schema } = mongoose;

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "Billing Session", trim: true },
    sessionId: { type: String, required: true, trim: true },
    qrCode: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "COMPLETED", "CANCELLED"], default: "ACTIVE", index: true },
    cartItems: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        barcodeId: { type: Schema.Types.ObjectId, ref: "Barcode", default: null },
        code: { type: String, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
        lineTotal: { type: Number, required: true },
      },
    ],
    deviceIds: { type: [String], default: [] },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    expiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema, "sessions");

export default Session;
