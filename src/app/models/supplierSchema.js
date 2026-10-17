import mongoose from "mongoose";

const { Schema } = mongoose;

const supplierSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  contact: { type: String, trim: true, default: "", maxlength: 60 },
  email: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
  address: { type: String, trim: true, default: "", maxlength: 500 },
  products: { type: Number, min: 0, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  status: { type: String, enum: ["Active", "Pending", "Inactive"], default: "Active" },
}, { timestamps: true });

supplierSchema.index({ userId: 1, name: 1 });

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema, "suppliers");
export default Supplier;
