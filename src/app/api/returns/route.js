// API route for creating return records from completed orders.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { returnOrder } from "@/app/services/orderService";

export async function POST(request) {
  try {
    const auth = await assertAuth(request);
    const body = await parseJsonBody(request);
    const returned = await returnOrder(auth.userId, body.originalOrderId, {
      items: body.items,
      notes: body.notes,
      processedBy: auth.userId,
    });
    return success("Return processed successfully", { returned }, null, 201);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
