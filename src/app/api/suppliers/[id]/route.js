import mongoose from "mongoose";
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import Supplier from "@/app/models/supplierSchema";

function validatePatch(input) {
  const payload = {};
  if (input.name !== undefined) {
    payload.name = String(input.name || "").trim();
    if (!payload.name || payload.name.length > 160) {
      const error = new Error("Supplier name is required and must be 160 characters or fewer.");
      error.status = 400;
      throw error;
    }
  }
  for (const key of ["contact", "email", "address"]) {
    if (input[key] !== undefined) payload[key] = String(input[key] || "").trim();
  }
  if (payload.email) {
    payload.email = payload.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      const error = new Error("Enter a valid supplier email address.");
      error.status = 400;
      throw error;
    }
  }
  if (input.products !== undefined) {
    payload.products = Number(input.products);
    if (!Number.isFinite(payload.products) || payload.products < 0) {
      const error = new Error("Product count must be zero or more.");
      error.status = 400;
      throw error;
    }
  }
  if (input.rating !== undefined) {
    payload.rating = Number(input.rating);
    if (!Number.isFinite(payload.rating) || payload.rating < 0 || payload.rating > 5) {
      const error = new Error("Rating must be between 0 and 5.");
      error.status = 400;
      throw error;
    }
  }
  if (input.status !== undefined) {
    payload.status = String(input.status);
    if (!["Active", "Pending", "Inactive"].includes(payload.status)) {
      const error = new Error("Choose a valid supplier status.");
      error.status = 400;
      throw error;
    }
  }
  return payload;
}

export async function PUT(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return failure("Supplier not found.", null, 404);
    const payload = validatePatch(await parseJsonBody(request));
    if (!Object.keys(payload).length) return failure("No supplier fields were provided.", null, 400);
    await dbConnect();
    const supplier = await Supplier.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();
    if (!supplier) return failure("Supplier not found.", null, 404);
    return success("Supplier updated successfully.", { supplier });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return failure("Supplier not found.", null, 404);
    await dbConnect();
    const result = await Supplier.deleteOne({ _id: id, userId: auth.userId });
    if (!result.deletedCount) return failure("Supplier not found.", null, 404);
    return success("Supplier deleted successfully.", { deletedCount: result.deletedCount });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
