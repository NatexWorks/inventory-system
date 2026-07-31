// API route for reading a single order record.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { getOrderById } from "@/app/services/orderService";
import Order from "@/app/models/orderSchema";
import dbConnect from "@/app/lib/db";

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
    await dbConnect();
    const order = await Order.findOneAndUpdate(
      { _id: id, userId: auth.userId, status: { $ne: "COMPLETED" } },
      { $set: body },
      { returnDocument: "after", runValidators: true }
    );

    if (!order) {
      return failure("Order not found or already completed", null, 404);
    }

    return success("Order updated successfully", { order });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
