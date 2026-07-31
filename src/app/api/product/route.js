// API route for listing and creating products.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parsePagination, parseJsonBody } from "@/app/lib/apiHelpers";
import { createProduct, listProducts } from "@/app/services/productService";
import { productSchema } from "@/app/lib/validation";

export async function POST(request) {
  try {
    const auth = await assertAuth(request);
    const data = await parseJsonBody(request);
    const payload = productSchema.parse({
      ...data,
      userId: auth.userId,
      barcodes: data.barcodes?.length
        ? data.barcodes.map((item) => ({ code: item.code, state: item.state || "AVAILABLE" }))
        : undefined,
    });

    const product = await createProduct(auth.userId, payload);
    return success("Product added successfully", { product });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const { page, limit, search } = parsePagination(request);
    const data = await listProducts(auth.userId, { page, limit, search });
    return success("Products fetched successfully", data);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
