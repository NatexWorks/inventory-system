// API route for listing and creating categories.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import { createCategory, listCategories } from "@/app/services/categoryService";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const data = await listCategories(auth.userId);
    return success("Categories fetched successfully", data);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function POST(request) {
  try {
    const auth = await assertAuth(request);
    const body = await request.json();
    const category = await createCategory(auth.userId, body);
    return success("Category created successfully", { category }, null, 201);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
