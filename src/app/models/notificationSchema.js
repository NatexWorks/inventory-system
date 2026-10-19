// Persistent low-stock notification events for a user's workspace.
import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    type: { type: String, enum: ["low_stock"], default: "low_stock", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    level: { type: String, enum: ["warning", "critical"], default: "warning" },
    stockAtCreation: { type: Number, required: true, min: 0 },
    thresholdAtCreation: { type: Number, required: true, min: 0 },
    // Read events remain acknowledged; stock changes must not make them unread again.
    readAt: { type: Date, default: null, index: true },
    // Only one active event may exist for a product at a time. A new event is
    // created if the stock recovers and subsequently falls below the threshold again.
    active: { type: Boolean, default: true },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "notifications" }
);

notificationSchema.index(
  { userId: 1, productId: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: "one_active_low_stock_notification_per_product",
  }
);
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
