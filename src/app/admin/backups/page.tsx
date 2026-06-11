import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminBackupsPage() {
  return (
    <div className="admin-stack">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Backups</p>
          <h1>备份导出</h1>
          <p>导出后台维护数据，便于迁移、审计或本地留档。导出仅包含 JSON，不生成简历 PDF。</p>
        </div>
      </header>

      <section className="admin-card admin-download" aria-labelledby="backup-export-title">
        <div>
          <h2 id="backup-export-title">JSON 备份内容</h2>
          <p>备份会包含公开资料、项目、Markdown PRD、项目思考、投递记录，以及访问统计相关的 sessions 和 events。</p>
          <ul className="admin-plain-list">
            <li>profiles：公开身份、联系方式和 resume snapshot。</li>
            <li>projects：作品集项目、PRD Markdown、贡献说明、AI 使用说明、关键取舍和复盘。</li>
            <li>campaigns：公司、岗位、JD 摘要、渠道标签和专属链接 slug。</li>
            <li>sessions / events：访问会话与交互事件，用于后续 analytics 汇总。</li>
          </ul>
        </div>
        <a className="admin-button admin-button--link" href="/api/admin/backups">
          <Download aria-hidden="true" size={17} />
          导出 JSON 备份
        </a>
      </section>
    </div>
  );
}
