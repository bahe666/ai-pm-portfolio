import { Activity, BarChart3, Clock3, MousePointerClick, Route, Tags } from "lucide-react";
import type { AnalyticsDashboardData, FunnelStep } from "@/lib/data/analytics";
import type { EventType } from "@/lib/types";

export function AnalyticsDashboard({ data }: { data: AnalyticsDashboardData }) {
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
              {data.projectInterest.length === 0 ? <EmptyRow colSpan={6} label="暂无项目行为事件。" /> : null}
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
                {data.campaignSummary.campaigns.length === 0 ? <EmptyRow colSpan={5} label="暂无投递链接数据。" /> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-card" aria-labelledby="tag-preference-title">
          <div className="admin-section-heading">
            <div>
              <h2 id="tag-preference-title">JD 标签偏好</h2>
              <p>由投递链接标签与实际访问事实归并。</p>
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
            {data.campaignSummary.tagPreferences.length === 0 ? <EmptyState label="暂无标签访问数据。" /> : null}
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
                {data.prdSectionInterest.length === 0 ? <EmptyRow colSpan={3} label="暂无 PRD 小节数据。" /> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="admin-card" aria-labelledby="recent-sessions-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="recent-sessions-title">最近会话路径</h2>
            <p>最近访问、来源、地点和事件序列。</p>
          </div>
          <MousePointerClick aria-hidden="true" size={22} />
        </div>
        <div className="analytics-session-list">
          {data.recentSessions.map((session) => (
            <article className="analytics-session" key={session.sessionId}>
              <div className="analytics-session__meta">
                <div>
                  <strong>{session.campaignLabel}</strong>
                  <span>访客 {shortId(session.visitorId)}</span>
                  <span>{formatDateTime(session.startedAt)}</span>
                </div>
                <div>
                  <span>{session.location}</span>
                  <span>{session.ipAddress ?? "IP 未记录"}</span>
                  {session.sourceHint ? <span>{session.sourceHint}</span> : null}
                </div>
              </div>
              <div className="analytics-path-list" aria-label="访问路径">
                {session.paths.length > 0 ? session.paths.map((path) => <span key={path}>{path}</span>) : <span>暂无路径</span>}
              </div>
              <ol className="analytics-event-list">
                {session.events.map((event) => (
                  <li key={`${session.sessionId}-${event.eventType}-${event.occurredAt}-${event.path}`}>
                    <span>{formatEventType(event.eventType)}</span>
                    <strong>{event.projectTitle ?? event.targetUrl ?? event.path}</strong>
                    <time dateTime={event.occurredAt}>{formatTime(event.occurredAt)}</time>
                  </li>
                ))}
                {session.events.length === 0 ? <li>暂无事件</li> : null}
              </ol>
            </article>
          ))}
          {data.recentSessions.length === 0 ? <EmptyState label="暂无会话数据。" /> : null}
        </div>
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatEventType(eventType: EventType) {
  const labels: Record<EventType, string> = {
    page_view: "页面",
    session_start: "开始",
    session_end: "结束",
    project_impression: "曝光",
    project_expand: "展开",
    project_detail_view: "详情",
    prd_summary_expand: "PRD 摘要",
    prd_full_view: "PRD 全文",
    prd_section_view: "PRD 小节",
    section_dwell: "停留",
    demo_click: "Demo",
    external_link_click: "外链",
    resume_snapshot_view: "经历"
  };

  return labels[eventType];
}

function shortId(id: string) {
  return id.slice(0, 8);
}
