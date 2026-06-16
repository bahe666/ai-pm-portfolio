import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import {
  EMPTY_DASHBOARD,
  getAnalyticsDashboard,
  getPaginatedSessions,
  type AnalyticsDashboardData,
  type PaginatedSessions
} from "@/lib/data/analytics";

export const dynamic = "force-dynamic";

type AdminAnalyticsPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page = parsePageParam(resolvedSearchParams.page);
  let data: AnalyticsDashboardData = EMPTY_DASHBOARD;
  let sessions: PaginatedSessions = createEmptySessions(page, 12);
  let errorMessage: string | undefined;

  try {
    [data, sessions] = await Promise.all([getAnalyticsDashboard(), getPaginatedSessions({ page, pageSize: 12 })]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "数据暂不可用";
    sessions = createEmptySessions(page, 12);
  }

  return <AnalyticsDashboard data={data} sessions={sessions} errorMessage={errorMessage} />;
}

function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function createEmptySessions(page: number, pageSize: number): PaginatedSessions {
  return {
    items: [],
    page,
    pageSize,
    total: 0,
    totalPages: 0
  };
}
