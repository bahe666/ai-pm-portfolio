import { revalidatePath } from "next/cache";
import { Link2, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { CampaignInputSchema, createCampaign, listCampaigns } from "@/lib/data/admin";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createCampaignAction(formData: FormData) {
  "use server";

  await requireAdmin();
  await createCampaign(
    CampaignInputSchema.parse({
      company: getString(formData, "company"),
      role: getString(formData, "role"),
      slug: getString(formData, "slug"),
      jdUrl: getString(formData, "jdUrl"),
      tags: parseTags(getString(formData, "tags")),
      channel: getString(formData, "channel") || "manual",
      jdSummary: getString(formData, "jdSummary"),
      notes: getString(formData, "notes"),
      isActive: formData.get("isActive") === "on"
    })
  );
  revalidatePath("/admin/campaigns");
}

export default async function AdminCampaignsPage() {
  const campaigns = await listCampaigns();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <div className="admin-stack">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Campaigns</p>
          <h1>投递追踪链接</h1>
          <p>为不同公司、岗位或渠道生成专属访问入口，后续 analytics 会按 campaign 汇总访问数据。</p>
        </div>
        <div className="admin-kpi-grid" aria-label="投递概览">
          <Metric label="全部链接" value={campaigns.length} />
          <Metric label="启用中" value={campaigns.filter((campaign) => campaign.isActive).length} />
        </div>
      </header>

      <section className="admin-card" aria-labelledby="new-campaign-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="new-campaign-title">创建投递链接</h2>
            <p>Slug 会出现在 `/v/slug` 中，建议使用公司和岗位缩写，便于回看数据。</p>
          </div>
        </div>

        <form action={createCampaignAction} className="admin-form">
          <div className="admin-form__grid">
            <label>
              公司
              <input name="company" placeholder="示例公司" required />
            </label>
            <label>
              岗位
              <input name="role" placeholder="AI 产品经理实习生" required />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9-]+" placeholder="example-ai-pm" required />
            </label>
            <label>
              JD URL
              <input name="jdUrl" placeholder="https://..." type="url" />
            </label>
            <label>
              标签
              <input name="tags" placeholder="Agent,AI PM,实习" />
            </label>
            <label>
              渠道
              <input defaultValue="manual" name="channel" />
            </label>
          </div>

          <label>
            JD 摘要
            <textarea name="jdSummary" placeholder="记录岗位关注点，便于后续复盘。" rows={4} />
          </label>
          <label>
            备注
            <textarea name="notes" rows={3} />
          </label>
          <div className="admin-form__checks">
            <label>
              <input defaultChecked name="isActive" type="checkbox" />
              启用专属链接
            </label>
          </div>
          <button className="admin-button" type="submit">
            <Plus aria-hidden="true" size={17} />
            创建链接
          </button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="campaign-list-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="campaign-list-title">现有投递记录</h2>
            <p>专属链接会跳转到公开首页并记录 campaign 来源；关闭 active 后保留历史记录。</p>
          </div>
          <Link2 aria-hidden="true" size={22} />
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>公司 / 岗位</th>
                <th>JD 摘要</th>
                <th>标签</th>
                <th>状态</th>
                <th>专属链接</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <CampaignRow campaign={campaign} key={campaign.id} siteUrl={siteUrl} />
              ))}
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5}>暂无投递链接。使用上方表单创建第一条 campaign。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
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

function CampaignRow({ campaign, siteUrl }: { campaign: Campaign; siteUrl: string }) {
  const campaignUrl = `${siteUrl}/v/${campaign.slug}`;

  return (
    <tr>
      <td>
        <strong>{campaign.company}</strong>
        <small>{campaign.role}</small>
        <small>{campaign.channel}</small>
      </td>
      <td>{campaign.jdSummary ?? "未填写"}</td>
      <td>{campaign.tags.length > 0 ? campaign.tags.join(", ") : "未设置"}</td>
      <td>
        <span className={`admin-badge ${campaign.isActive ? "admin-badge--published" : "admin-badge--hidden"}`}>
          {campaign.isActive ? "启用" : "停用"}
        </span>
      </td>
      <td>
        <a href={campaignUrl} rel="noreferrer" target="_blank">
          {campaignUrl}
        </a>
      </td>
    </tr>
  );
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
