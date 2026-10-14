// API route for reading and updating a single billing session.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { cancelSession, completeSession, getSessionBySessionId, joinSession } from "@/app/services/sessionService";


export async function GET(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const session = await getSessionBySessionId(auth.userId, id);

    if (!session) {
      return failure("Session not found", null, 404);
    }

    return success("Session fetched successfully", { session });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await assertAuth(request);
    const { id } = await params;
    const body = await parseJsonBody(request);

    let session;
    if (body.action === "join") {
      if (typeof body.deviceId !== "string" || !body.deviceId.trim()) {
        return failure("A device ID is required to join a session", null, 400);
      }
      session = await joinSession(auth.userId, id, body.deviceId.trim());
    } else if (body.action === "complete") {
      session = await completeSession(auth.userId, id);
    } else if (body.action === "cancel") {
      session = await cancelSession(auth.userId, id);
    } else {
      return failure("Unsupported session action", null, 400);
    }

    if (!session) {
      return failure("Session not found", null, 404);
    }
    return success("Session updated successfully", { session });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
