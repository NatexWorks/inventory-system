import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import Supplier from "@/app/models/supplierSchema";

function validateSupplier(input, partial = false) {
  const payload = {};
  if (!partial || input.name !== undefined) {
    const name = String(input.name || "").trim();
    if (!name) {
      const error = new Error("Supplier name is required.");
      error.status = 400;
      throw error;
    }
    if (name.length > 160) {
      const error = new Error("Supplier name must be 160 characters or fewer.");
      error.status = 400;
      throw error;
    }
    payload.name = name;
  }
  for (const key of ["contact", "email", "address"]) {
    if (!partial || input[key] !== undefined) payload[key] = String(input[key] || "").trim();
  }
  if (payload.email) {
    payload.email = payload.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      const error = new Error("Enter a valid supplier email address.");
      error.status = 400;
      throw error;
    }
  }
  if (!partial || input.products !== undefined) {
    payload.products = Number(input.products ?? 0);
    if (!Number.isFinite(payload.products) || payload.products < 0) {
      const error = new Error("Product count must be zero or more.");
      error.status = 400;
      throw error;
    }
  }
  if (!partial || input.rating !== undefined) {
    payload.rating = Number(input.rating ?? 0);
    if (!Number.isFinite(payload.rating) || payload.rating < 0 || payload.rating > 5) {
      const error = new Error("Rating must be between 0 and 5.");
      error.status = 400;
      throw error;
    }
  }
  if (!partial || input.status !== undefined) {
    payload.status = String(input.status || "Active");
    if (!["Active", "Pending", "Inactive"].includes(payload.status)) {
      const error = new Error("Choose a valid supplier status.");
      error.status = 400;
      throw error;
    }
  }
  return payload;
}

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    const suppliers = await Supplier.find({ userId: auth.userId }).sort({ name: 1 }).lean();
    return success("Suppliers fetched successfully.", { suppliers });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function POST(request) {
  try {
    const auth = await assertAuth(request);
    const input = await parseJsonBody(request);
    const payload = validateSupplier(input);
    await dbConnect();
    const supplier = await Supplier.create({ ...payload, userId: auth.userId });
    return success("Supplier created successfully.", { supplier }, 201);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
