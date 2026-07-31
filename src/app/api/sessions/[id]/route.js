// API route for reading and updating a single billing session.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { cancelSession, completeSession, getSessionBySessionId, joinSession } from "@/app/services/sessionService";
import dbConnect from "@/app/lib/db";
import Session from "@/app/models/sessionSchema";

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
      session = await joinSession(auth.userId, id, body.deviceId);
    } else if (body.action === "complete") {
      session = await completeSession(auth.userId, id);
    } else if (body.action === "cancel") {
      session = await cancelSession(auth.userId, id);
    } else {
      await dbConnect();
      session = await Session.findOneAndUpdate(
        { sessionId: id, userId: auth.userId },
        { $set: body },
        { returnDocument: "after" }
      );
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
