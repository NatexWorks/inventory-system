// API route that aggregates the report dashboard payload.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import { buildDashboardSummary, buildCategoryAnalytics } from "@/app/services/reportService";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const summary = await buildDashboardSummary(auth.userId);
    const categories = await buildCategoryAnalytics(auth.userId);
    return success("Reports fetched successfully", { summary, categories });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
