// API route that approves an order and updates stock.
import dbConnect from "@/app/lib/db";
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertOwner } from "@/app/lib/apiHelpers";
import { approveOrder } from "@/app/services/orderService";
import { emitRealtime } from "@/app/lib/realtime";

export async function POST(request, { params }) {
  try {
    const auth = await assertOwner(request);
    await dbConnect();
    const { id } = await params;
    const order = await approveOrder(auth.userId, id, auth.userId);
    emitRealtime("order:approved", { userId: auth.userId, orderId: String(order._id), order });
    return success("Order approved successfully", { order });
  } catch (error) {
    const normalized = normalizeError(error);
    console.log(normalized);

    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
