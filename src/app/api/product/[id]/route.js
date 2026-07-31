// API route for reading, updating, and deleting a single product.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { productSchema } from "@/app/lib/validation";
import { deleteProduct, getProductById, updateProduct } from "@/app/services/productService";

export async function GET(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const product = await getProductById(auth.userId, id);
    return success("Product fetched successfully", { product });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const data = await parseJsonBody(request);

    const payload = productSchema.partial().parse({
      ...data,
      userId: auth.userId,
      barcodes: data.barcodes?.length
        ? data.barcodes.map((item) => ({ code: item.code, state: item.state || "AVAILABLE" }))
        : undefined,
    });

    const product = await updateProduct(auth.userId, id, payload);
    return success("Product updated successfully", { product });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const result = await deleteProduct(auth.userId, id);
    return success("Product deleted successfully", { deletedCount: result.deletedCount || 0 });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

