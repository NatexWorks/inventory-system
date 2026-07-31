// API route for listing orders and creating new ones.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody, parsePagination } from "@/app/lib/apiHelpers";
import { createOrder, listOrders } from "@/app/services/orderService";
import { getSettings } from "@/app/services/settingsService";
import { orderSchema } from "@/app/lib/validation";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const { page, limit, search } = parsePagination(request);
    const data = await listOrders(auth.userId, { page, limit, search });
    return success("Orders fetched successfully", data);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function POST(request) {
  try {
    const auth = await assertAuth(request);
    const body = await parseJsonBody(request);
    const payload = orderSchema.parse(body);
    const settings = await getSettings(auth.userId);
    const order = await createOrder(
      auth.userId,
      {
        ...payload,
        status: "PENDING_APPROVAL",
      },
      settings || {}
    );
    return success("Order created successfully", { order });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
