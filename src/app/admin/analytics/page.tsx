import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { EMPTY_DASHBOARD, getAnalyticsDashboard, type AnalyticsDashboardData } from "@/lib/data/analytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  let data: AnalyticsDashboardData = EMPTY_DASHBOARD;
  let errorMessage: string | undefined;

  try {
    data = await getAnalyticsDashboard();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "数据暂不可用";
  }

  return <AnalyticsDashboard data={data} errorMessage={errorMessage} />;
}
