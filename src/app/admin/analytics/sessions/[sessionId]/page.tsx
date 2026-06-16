import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionDetailView } from "@/components/admin/session-detail";
import { requireAdmin } from "@/lib/auth/admin";
import { getSessionDetail } from "@/lib/data/analytics";

export const dynamic = "force-dynamic";

type SessionDetailPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  await requireAdmin();
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);

  if (!session) notFound();

  return (
    <div className="admin-stack">
      <Link className="admin-back-link" href="/admin/analytics">
        返回数据驾驶舱
      </Link>
      <SessionDetailView session={session} />
    </div>
  );
}
