// API route that cancels an order.
import dbConnect from "@/app/lib/db";
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import { cancelOrder } from "@/app/services/orderService";
import { emitRealtime } from "@/app/lib/realtime";

export async function POST(request, { params }) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    const { id } = await params;
    const order = await cancelOrder(auth.userId, id, auth.userId);
    emitRealtime("order:cancelled", {
      userId: auth.userId,
      orderId: String(order._id),
      order,
    });
    return success("Order cancelled successfully", { order });
  } catch (error) {
    const normalized = normalizeError(error);
    console.log(normalized);

    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
