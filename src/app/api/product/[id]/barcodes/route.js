// Add barcode assignments without replacing existing product barcodes.
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { failure, normalizeError, success } from "@/app/lib/response";
import { addProductBarcodes } from "@/app/services/productService";

export async function POST(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const body = await parseJsonBody(request);
    const barcodes = Array.isArray(body?.barcodes) ? body.barcodes : [];
    const product = await addProductBarcodes(auth.userId, id, barcodes);
    return success("Barcodes added successfully", { product });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
