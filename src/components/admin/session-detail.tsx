import { Clock3, ExternalLink, Route, UserRound } from "lucide-react";
import type { SessionDetail } from "@/lib/data/analytics";

export function SessionDetailView({ session }: { session: SessionDetail }) {
  return (
    <article className="session-detail">
      <header className="admin-page-header session-detail__header">
        <div>
          <p className="eyebrow">Session Detail</p>
          <h1>{session.campaignLabel}</h1>
          <p>
            访客 {shortId(session.visitorId)}，{formatDateTime(session.startedAt)} 开始
          </p>
        </div>
        <div className="admin-kpi-grid session-detail__kpis" aria-label="会话概览">
          <Metric label="事件" value={String(session.eventCount)} />
          <Metric label="时长" value={formatDuration(session.durationSeconds)} />
          <Metric label="路径" value={String(session.paths.length)} />
        </div>
      </header>

      <section className="admin-card" aria-labelledby="session-meta-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="session-meta-title">会话信息</h2>
            <p>来源、地点、访问时间和入口事实。</p>
          </div>
          <UserRound aria-hidden="true" size={22} />
        </div>
        <dl className="session-detail__meta">
          <div>
            <dt>投递链接</dt>
            <dd>{session.campaignLabel}</dd>
          </div>
          <div>
            <dt>访客</dt>
            <dd>{shortId(session.visitorId)}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>{session.location}</dd>
          </div>
          <div>
            <dt>来源提示</dt>
            <dd>{session.sourceHint ?? "无"}</dd>
          </div>
          <div>
            <dt>Referrer</dt>
            <dd>{session.referrer ?? "无"}</dd>
          </div>
          <div>
            <dt>入口路径</dt>
            <dd>{session.entryPath ?? "无"}</dd>
          </div>
          <div>
            <dt>开始</dt>
            <dd>{formatDateTime(session.startedAt)}</dd>
          </div>
          <div>
            <dt>结束</dt>
            <dd>{formatDateTime(session.endedAt ?? session.lastEventAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-card" aria-labelledby="session-paths-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="session-paths-title">访问路径</h2>
            <p>按发生时间去重后的路径。</p>
          </div>
          <Route aria-hidden="true" size={22} />
        </div>
        <div className="session-detail__chips">
          {session.paths.length > 0 ? session.paths.map((path) => <span key={path}>{path}</span>) : <span>暂无路径</span>}
        </div>
      </section>

      <section className="admin-card" aria-labelledby="session-events-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="session-events-title">事件时间线</h2>
            <p>完整事件序列，按发生时间升序。</p>
          </div>
          <Clock3 aria-hidden="true" size={22} />
        </div>
        <ol className="session-timeline">
          {session.events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time>
              <div>
                <strong>{event.label}</strong>
                <p>{event.projectTitle ?? event.path}</p>
                <div className="session-timeline__facts">
                  <span>{event.path}</span>
                  {event.targetUrl ? (
                    <a href={event.targetUrl} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" size={14} />
                      目标链接
                    </a>
                  ) : null}
                  {event.sectionId ? <span>小节 {event.sectionId}</span> : null}
                  {typeof event.durationMs === "number" ? <span>停留 {formatMilliseconds(event.durationMs)}</span> : null}
                </div>
              </div>
            </li>
          ))}
          {session.events.length === 0 ? <li>暂无事件</li> : null}
        </ol>
      </section>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

function formatDuration(seconds: number | null) {
  if (seconds === null) return "无";
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分`;
}

function formatMilliseconds(milliseconds: number) {
  return `${Math.round(milliseconds / 1000)} 秒`;
}

function shortId(id: string) {
  return id.slice(0, 8);
}
