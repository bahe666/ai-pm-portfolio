import Link from "next/link";
import { Activity, BarChart3, Clock3, Database, MousePointerClick, Route, Tags } from "lucide-react";
import type { AnalyticsDashboardData, FunnelStep, PaginatedSessions } from "@/lib/data/analytics";

export function AnalyticsDashboard({
  data,
  sessions,
  errorMessage
}: {
  data: AnalyticsDashboardData;
  sessions: PaginatedSessions;
  errorMessage?: string;
}) {
  const maxFunnelSessions = Math.max(...data.funnel.map((step) => step.sessions), 1);

  return (
    <div className="admin-stack analytics-dashboard">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>数据驾驶舱</h1>
          <p>项目兴趣、投递链接、阅读路径与最近访问事实。</p>
        </div>
        <div className="admin-kpi-grid analytics-kpi-grid" aria-label="访问概览">
          <Metric label="会话" value={data.kpis.totalSessions} />
          <Metric label="访客" value={data.kpis.totalVisitors} />
          <Metric label="事件" value={data.kpis.totalEvents} />
          <Metric label="投递会话" value={data.kpis.campaignSessions} />
          <Metric label="项目详情" value={data.kpis.projectDetailViews} />
          <Metric label="Demo/外链" value={data.kpis.demoClicks} />
        </div>
      </header>

      {errorMessage ? (
        <p className="analytics-error" role="status">
          数据暂不可用：{errorMessage}
        </p>
      ) : null}

      <section className="analytics-volume-strip" aria-labelledby="data-volume-title">
        <div>
          <div className="analytics-volume-strip__title">
            <Database aria-hidden="true" size={18} />
            <p className="eyebrow">Data Source</p>
          </div>
          <h2 id="data-volume-title">当前真实数据量</h2>
          <p>来自 Supabase 表记录数，用来判断当前样本是否足够支撑判断。</p>
        </div>
        <dl className="analytics-volume-grid">
          <VolumeMetric label="项目数据" value={data.dataVolume.projects} />
          <VolumeMetric label="投递链接" value={data.dataVolume.campaigns} />
          <VolumeMetric label="会话记录" value={data.dataVolume.sessions} />
          <VolumeMetric label="事件记录" value={data.dataVolume.events} />
        </dl>
      </section>

      <section className="admin-card" aria-labelledby="project-interest-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="project-interest-title">项目兴趣</h2>
            <p>按项目行为汇总。</p>
          </div>
          <BarChart3 aria-hidden="true" size={22} />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table analytics-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>曝光</th>
                <th>详情</th>
                <th>PRD 深读</th>
                <th>Demo/外链</th>
                <th>平均停留</th>
              </tr>
            </thead>
            <tbody>
              {data.projectInterest.map((project) => (
                <tr key={project.projectId}>
                  <td>
                    <strong>{project.title}</strong>
                    <small>{project.slug ? `/${project.slug}` : project.projectId}</small>
                  </td>
                  <NumberCell value={project.impressions} />
                  <NumberCell value={project.detailViews} />
                  <NumberCell value={project.prdDeepReads} />
                  <NumberCell value={project.demoClicks} />
                  <td>{formatSeconds(project.averageDwellSeconds)}</td>
                </tr>
              ))}
              {data.projectInterest.length === 0 ? (
                <EmptyRow colSpan={6} label="暂无项目详情访问。等有访客进入项目、阅读 PRD 或点击 Demo 后，这里会显示真实兴趣排序。" />
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="analytics-split">
        <section className="admin-card" aria-labelledby="campaign-comparison-title">
          <div className="admin-section-heading">
            <div>
              <h2 id="campaign-comparison-title">投递链接对比</h2>
              <p>按 campaign 会话和项目行为汇总。</p>
            </div>
            <Route aria-hidden="true" size={22} />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table analytics-table analytics-table--compact">
              <thead>
                <tr>
                  <th>公司 / 岗位</th>
                  <th>会话</th>
                  <th>详情</th>
                  <th>Demo</th>
                  <th>最近访问</th>
                </tr>
              </thead>
              <tbody>
                {data.campaignSummary.campaigns.map((campaign) => (
                  <tr key={campaign.campaignId}>
                    <td>
                      <strong>{campaign.company}</strong>
                      <small>{campaign.role}</small>
                      <small>/{campaign.slug}</small>
                    </td>
                    <NumberCell value={campaign.sessions} />
                    <NumberCell value={campaign.projectDetailViews} />
                    <NumberCell value={campaign.demoClicks} />
                    <td>{formatDateTime(campaign.lastSeenAt)}</td>
                  </tr>
                ))}
                {data.campaignSummary.campaigns.length === 0 ? (
                  <EmptyRow colSpan={5} label="暂无投递链接访问。创建专属链接并被打开后，这里会显示公司/岗位对比。" />
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card" aria-labelledby="tag-preference-title">
          <div className="admin-section-heading">
            <div>
              <h2 id="tag-preference-title">JD 标签偏好</h2>
              <p>按 campaign 标签累计，多标签 campaign 会重复计入每个标签。</p>
            </div>
            <Tags aria-hidden="true" size={22} />
          </div>
          <div className="analytics-tag-list">
            {data.campaignSummary.tagPreferences.map((tag) => (
              <div className="analytics-tag-row" key={tag.tag}>
                <strong>{tag.tag}</strong>
                <span>{tag.sessions} 会话</span>
                <span>{tag.projectDetailViews} 详情</span>
                <span>{tag.demoClicks} Demo</span>
              </div>
            ))}
            {data.campaignSummary.tagPreferences.length === 0 ? (
              <EmptyState label="暂无 JD 标签偏好。带标签的投递链接产生访问后，这里会出现真实统计。" />
            ) : null}
          </div>
        </section>
      </div>

      <div className="analytics-split">
        <section className="admin-card" aria-labelledby="funnel-title">
          <div className="admin-section-heading">
            <div>
              <h2 id="funnel-title">阅读漏斗</h2>
              <p>按唯一会话计数。</p>
            </div>
            <Activity aria-hidden="true" size={22} />
          </div>
          <div className="analytics-funnel">
            {data.funnel.map((step) => (
              <FunnelBar key={step.key} max={maxFunnelSessions} step={step} />
            ))}
          </div>
        </section>

        <section className="admin-card" aria-labelledby="section-interest-title">
          <div className="admin-section-heading">
            <div>
              <h2 id="section-interest-title">PRD 小节</h2>
              <p>小节浏览和停留。</p>
            </div>
            <Clock3 aria-hidden="true" size={22} />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table analytics-table analytics-table--compact">
              <thead>
                <tr>
                  <th>小节</th>
                  <th>浏览</th>
                  <th>平均停留</th>
                </tr>
              </thead>
              <tbody>
                {data.prdSectionInterest.slice(0, 8).map((section) => (
                  <tr key={section.sectionId}>
                    <td>
                      <strong>{section.sectionId}</strong>
                    </td>
                    <NumberCell value={section.views} />
                    <td>{formatSeconds(section.averageDwellSeconds)}</td>
                  </tr>
                ))}
                {data.prdSectionInterest.length === 0 ? (
                  <EmptyRow colSpan={3} label="暂无 PRD 阅读事件。访客打开并阅读 PRD 后，这里会显示小节兴趣。" />
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="admin-card" aria-labelledby="recent-sessions-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="recent-sessions-title">最近会话路径</h2>
            <p>分页查看最近访问、入口路径、项目兴趣和关键动作。</p>
          </div>
          <MousePointerClick aria-hidden="true" size={22} />
        </div>
        {sessions.items.length > 0 ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table analytics-table analytics-session-table">
                <thead>
                  <tr>
                    <th>来源</th>
                    <th>访客 / 时间</th>
                    <th>地点</th>
                    <th>入口</th>
                    <th>事件</th>
                    <th>项目</th>
                    <th>关键动作</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.items.map((session) => (
                    <tr key={session.sessionId}>
                      <td>
                        <Link className="analytics-session-link" href={`/admin/analytics/sessions/${session.sessionId}`}>
                          <strong>{session.campaignLabel}</strong>
                          <small>{session.campaignSlug ? `/${session.campaignSlug}` : "直接访问"}</small>
                        </Link>
                      </td>
                      <td>
                        <strong>访客 {shortId(session.visitorId)}</strong>
                        <small>{formatDateTime(session.startedAt)}</small>
                      </td>
                      <td>
                        <strong>{session.location}</strong>
                        {session.sourceHint ? <small>{session.sourceHint}</small> : null}
                      </td>
                      <td>{session.entryPath ?? "无"}</td>
                      <NumberCell value={session.eventCount} />
                      <td>
                        <ChipList items={session.viewedProjects} emptyLabel="暂无项目" />
                      </td>
                      <td>
                        <ChipList items={session.keyActions} emptyLabel="暂无动作" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination sessions={sessions} />
          </>
        ) : (
          <EmptyState label="暂无可分析的会话。" />
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberCell({ value }: { value: number }) {
  return <td className="analytics-number">{value}</td>;
}

function VolumeMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan}>{label}</td>
    </tr>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="analytics-empty">{label}</p>;
}

function ChipList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  return (
    <div className="analytics-chip-list">
      {items.length > 0 ? items.map((item) => <span key={item}>{item}</span>) : <span>{emptyLabel}</span>}
    </div>
  );
}

function Pagination({ sessions }: { sessions: PaginatedSessions }) {
  const currentStart = sessions.total === 0 ? 0 : (sessions.page - 1) * sessions.pageSize + 1;
  const currentEnd = Math.min(sessions.total, sessions.page * sessions.pageSize);
  const hasPrevious = sessions.page > 1;
  const hasNext = sessions.totalPages > 0 && sessions.page < sessions.totalPages;

  return (
    <nav className="analytics-pagination" aria-label="会话分页">
      <span>
        第 {sessions.page} / {Math.max(sessions.totalPages, 1)} 页，显示 {currentStart}-{currentEnd} / {sessions.total}
      </span>
      <div>
        {hasPrevious ? <Link href={`/admin/analytics?page=${sessions.page - 1}`}>上一页</Link> : <span aria-disabled="true">上一页</span>}
        {hasNext ? <Link href={`/admin/analytics?page=${sessions.page + 1}`}>下一页</Link> : <span aria-disabled="true">下一页</span>}
      </div>
    </nav>
  );
}

function FunnelBar({ max, step }: { max: number; step: FunnelStep }) {
  const width = `${Math.max((step.sessions / max) * 100, step.sessions > 0 ? 4 : 0)}%`;

  return (
    <div className="analytics-funnel__row">
      <div>
        <strong>{step.label}</strong>
        <span>{step.sessions} 会话</span>
      </div>
      <span aria-hidden="true">
        <i style={{ width }} />
      </span>
    </div>
  );
}

function formatSeconds(seconds: number) {
  return seconds > 0 ? `${seconds.toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 秒` : "0 秒";
}

function formatDateTime(value: string | null) {
  if (!value) return "无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function shortId(id: string) {
  return id.slice(0, 8);
}
