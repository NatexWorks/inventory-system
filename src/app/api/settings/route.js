// API route for reading and updating workspace settings.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import { getSettings, upsertSettings } from "@/app/services/settingsService";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const settings = await getSettings(auth.userId);
    return success("Settings fetched successfully", { settings });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}

export async function PUT(request) {
  try {
    const auth = await assertAuth(request);
    const body = await parseJsonBody(request);
    const settings = await upsertSettings(auth.userId, body);
    return success("Settings updated successfully", { settings });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
