// API route for resolving a scanned barcode to a product.
import dbConnect from "@/app/lib/db";
import Barcode from "@/app/models/barcodeSchema";
import Product from "@/app/models/productSchema";
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { barcodeScanSchema } from "@/app/lib/validation";
import { reserveBarcode } from "@/app/services/barcodeService";

export async function POST(request) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    const body = barcodeScanSchema.parse(await parseJsonBody(request));
    const barcode = await Barcode.findOne({ userId: auth.userId, code: body.barcode }).lean();

    if (!barcode) {
      return failure("Barcode not found", null, 404);
    }

    if (barcode.state === "SOLD") {
      return failure("Barcode already sold", null, 409);
    }

    if (body.sessionId) {
      await reserveBarcode(auth.userId, body.barcode, body.sessionId);
    }

    const product = await Product.findOne({
      _id: barcode.productId,
      userId: auth.userId,
    }).lean();
    if (!product) {
      return failure("Barcode is not assigned to a valid product", null, 404);
    }
    return success("Barcode scanned successfully", { product, barcode, sessionId: body.sessionId || null });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
