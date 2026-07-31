// API route that returns dashboard summary data for the signed-in user.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import { buildDashboardSummary, buildCategoryAnalytics } from "@/app/services/reportService";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const [summary, categories] = await Promise.all([
      buildDashboardSummary(auth.userId),
      buildCategoryAnalytics(auth.userId),
    ]);
    return success("Dashboard data fetched successfully", { summary, categories });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
