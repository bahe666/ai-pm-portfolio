import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { getAnalyticsDashboard } from "@/lib/data/analytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsDashboard();

  return <AnalyticsDashboard data={data} />;
}
