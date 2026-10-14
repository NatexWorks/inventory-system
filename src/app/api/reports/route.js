// Reports endpoint returns dashboard analytics and selectable, period-scoped operational reports.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import {
  buildDashboardSummary,
  buildCategoryAnalytics,
  buildOperationalReports,
} from "@/app/services/reportService";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);
    const period = new URL(request.url).searchParams.get("period") || "month";
    const [summary, categories, operationalReports] = await Promise.all([
      buildDashboardSummary(auth.userId),
      buildCategoryAnalytics(auth.userId),
      buildOperationalReports(auth.userId, period),
    ]);
    return success("Reports fetched successfully", {
      summary,
      categories,
      operationalReports,
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
