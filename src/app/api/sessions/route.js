// API route for creating and listing billing sessions.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { createSession } from "@/app/services/sessionService";
import Session from "@/app/models/sessionSchema";
import dbConnect from "@/app/lib/db";

export async function POST(request) {
  try {
    const auth = await assertAuth(request, { roles: ["owner"] });
    const body = await parseJsonBody(request);
    const session = await createSession(auth.userId, auth.userId, body);
    return success("Session created successfully", { session });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    await dbConnect();
    const sessions = await Session.find({ userId: auth.userId }).sort({ createdAt: -1 }).lean();
    return success("Sessions fetched successfully", { sessions });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
