// Category schema stores the catalog grouping for products.
import mongoose from "mongoose";

const { Schema } = mongoose;

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, slug: 1 }, { unique: true });
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema, "categories");

export default Category;
