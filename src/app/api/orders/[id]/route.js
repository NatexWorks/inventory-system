// API route for reading a single order record.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { getOrderById, updatePendingOrder } from "@/app/services/orderService";
import { getSettings } from "@/app/services/settingsService";

export async function GET(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const order = await getOrderById(auth.userId, id);
    if (!order) {
      return failure("Order not found", null, 404);
    }
    return success("Order fetched successfully", { order });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const body = await parseJsonBody(request);
    const { id } = await params;
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return failure("Add at least one product to the order", null, 400);
    }
    if (body.customerName !== undefined && typeof body.customerName !== "string") {
      return failure("Customer name must be text", null, 400);
    }
    if (body.customerPhone !== undefined && typeof body.customerPhone !== "string") {
      return failure("Customer phone must be text", null, 400);
    }
    const allowed = {
      items: body.items,
      ...(body.customerName !== undefined ? { customerName: body.customerName } : {}),
      ...(body.customerPhone !== undefined ? { customerPhone: body.customerPhone } : {}),
      ...(body.notes !== undefined ? { notes: String(body.notes) } : {}),
      ...(body.discountAmount !== undefined ? { discountAmount: Number(body.discountAmount) } : {}),
    };
    const settings = await getSettings(auth.userId);
    const order = await updatePendingOrder(auth.userId, id, allowed, settings || {});
    return success("Pending order updated successfully", { order });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
