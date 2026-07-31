// API route for reading, updating, and deleting a single category.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { deleteCategory, updateCategory } from "@/app/services/categoryService";

export async function PUT(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const body = await parseJsonBody(request);
    const { id } = await params;
    const category = await updateCategory(auth.userId, id, body);
    return success("Category updated successfully", { category });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const result = await deleteCategory(auth.userId, id);
    return success("Category deleted successfully", { deletedCount: result.deletedCount || 0 });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
