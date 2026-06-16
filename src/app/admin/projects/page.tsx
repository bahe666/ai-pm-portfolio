import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus, UploadCloud } from "lucide-react";
import { ProjectDeleteButton } from "@/components/admin/project-delete-button";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminInputError, deleteProject, listAdminProjects, upsertProject } from "@/lib/data/admin";
import { isAdminProjectInputError, parseAdminProjectFormData } from "@/lib/data/admin-project-input";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<{
    message?: string | string[];
  }>;
};

async function createProjectAction(formData: FormData) {
  "use server";

  await requireAdmin();
  let message = "saved";

  try {
    const project = await parseAdminProjectFormData(formData);
    const saved = await upsertProject(project);
    revalidateProjectSurfaces(saved.slug);
  } catch (error) {
    message = isAdminProjectInputError(error) ? "invalid-input" : "save-failed";
  }

  redirect(`/admin/projects?message=${message}`);
}

async function updateProjectAction(formData: FormData) {
  "use server";

  await requireAdmin();
  let message = "updated";

  try {
    const id = readRequiredFormString(formData, "id");
    const project = await parseAdminProjectFormData(formData);
    const saved = await upsertProject(project, id);
    revalidateProjectSurfaces(saved.slug);
  } catch (error) {
    message = isAdminProjectInputError(error) ? "invalid-input" : "save-failed";
  }

  redirect(`/admin/projects?message=${message}`);
}

async function deleteProjectAction(formData: FormData) {
  "use server";

  await requireAdmin();
  let message = "deleted";

  try {
    const id = readRequiredFormString(formData, "id");
    const slug = readRequiredFormString(formData, "slug");
    await deleteProject(id);
    revalidateProjectSurfaces(slug);
  } catch {
    message = "delete-failed";
  }

  redirect(`/admin/projects?message=${message}`);
}

function revalidateProjectSurfaces(projectSlug?: string) {
  revalidatePath("/");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/analytics");
  if (projectSlug) revalidatePath(`/projects/${projectSlug}`);
}

export default async function AdminProjectsPage({ searchParams }: AdminPageProps) {
  const projects = await listAdminProjects();
  const statusMessage = getStatusMessage((await searchParams)?.message);

  return (
    <div className="admin-stack">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>项目管理</h1>
          <p>维护公开作品集项目、PRD Markdown、项目思考和首页展示顺序。</p>
        </div>
        <div className="admin-kpi-grid" aria-label="项目概览">
          <Metric label="全部项目" value={projects.length} />
          <Metric label="已发布" value={projects.filter((project) => project.status === "published").length} />
          <Metric label="精选" value={projects.filter((project) => project.isFeatured).length} />
        </div>
      </header>
      {statusMessage ? <StatusNotice message={statusMessage.message} tone={statusMessage.tone} /> : null}

      <section className="admin-card" aria-labelledby="new-project-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="new-project-title">新增项目</h2>
            <p>上传封面时会写入 Supabase Storage；如填写封面 URL，可使用公开图片地址或 `/covers/name.png`。</p>
          </div>
        </div>

        <form action={createProjectAction} className="admin-form" encType="multipart/form-data">
          <div className="admin-form__grid">
            <label>
              项目标题
              <input name="title" placeholder="Agent 协作原型" required />
            </label>
            <label>
              Slug
              <input name="slug" pattern="[a-z0-9-]+" placeholder="agent-collaboration-prototype" required />
            </label>
            <label>
              标签
              <input name="tags" placeholder="Agent,AI Workflow,PRD" />
            </label>
            <label>
              Demo URL
              <input name="demoUrl" placeholder="https://example.vercel.app" required type="url" />
            </label>
            <label>
              封面 URL
              <input name="coverImageUrl" placeholder="/covers/project.png 或 https://..." />
            </label>
            <label>
              上传封面
              <input accept="image/avif,image/gif,image/jpeg,image/png,image/webp" name="coverFile" type="file" />
            </label>
            <label>
              排序
              <input defaultValue="100" name="sortOrder" step="1" type="number" />
            </label>
            <label>
              状态
              <select defaultValue="draft" name="status">
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="hidden">隐藏</option>
              </select>
            </label>
          </div>

          <label>
            项目摘要
            <textarea name="summary" placeholder="一句话说明这个 Demo 解决了什么问题。" required rows={3} />
          </label>
          <label>
            我的贡献
            <textarea name="contribution" rows={3} />
          </label>
          <label>
            AI 使用说明
            <textarea name="aiUsage" rows={3} />
          </label>
          <label>
            关键判断 / 取舍
            <textarea name="decisions" rows={3} />
          </label>
          <label>
            项目思考
            <textarea name="reflection" rows={3} />
          </label>
          <label>
            PRD Markdown
            <textarea className="admin-form__mono" name="prdMarkdown" rows={10} />
          </label>

          <div className="admin-form__checks">
            <label>
              <input name="isFeatured" type="checkbox" />
              首页精选
            </label>
            <label>
              <input defaultChecked name="analyticsEnabled" type="checkbox" />
              记录项目交互数据
            </label>
          </div>

          <button className="admin-button" type="submit">
            <Plus aria-hidden="true" size={17} />
            新增项目
          </button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="project-list-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="project-list-title">现有项目状态</h2>
            <p>展开项目即可编辑内容、排序、公开状态、精选状态，或删除不再展示的项目。</p>
          </div>
          <UploadCloud aria-hidden="true" size={22} />
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>摘要</th>
                <th>状态</th>
                <th>精选</th>
                <th>排序</th>
                <th>Demo</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6}>暂无项目。使用上方表单创建第一条作品集项目。</td>
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

function ProjectRow({ project }: { project: Project }) {
  return (
    <tr className="admin-project-row">
      <td colSpan={6}>
        <details className="admin-project-editor">
          <summary>
            <span>
              <strong>{project.title}</strong>
              <small>{project.slug}</small>
              {project.coverImageUrl ? <small>{project.coverImageUrl}</small> : null}
            </span>
            <span>{project.summary}</span>
            <span>
              <span className={`admin-badge admin-badge--${project.status}`}>{statusLabel(project.status)}</span>
            </span>
            <span>{project.isFeatured ? "精选" : "非精选"}</span>
            <span>排序 {project.sortOrder}</span>
            <a href={project.demoUrl} rel="noreferrer" target="_blank">
              打开 Demo
            </a>
          </summary>

          <div className="admin-project-editor__body">
            <form action={updateProjectAction} className="admin-form admin-form--compact" encType="multipart/form-data">
              <input name="id" type="hidden" value={project.id} />
              <div className="admin-form__grid">
                <label>
                  项目标题
                  <input defaultValue={project.title} name="title" required />
                </label>
                <label>
                  Slug
                  <input defaultValue={project.slug} name="slug" pattern="[a-z0-9-]+" required />
                </label>
                <label>
                  标签
                  <input defaultValue={project.tags.join(",")} name="tags" />
                </label>
                <label>
                  Demo URL
                  <input defaultValue={project.demoUrl} name="demoUrl" required type="url" />
                </label>
                <label>
                  封面 URL
                  <input defaultValue={project.coverImageUrl ?? ""} name="coverImageUrl" />
                </label>
                <label>
                  上传封面
                  <input accept="image/avif,image/gif,image/jpeg,image/png,image/webp" name="coverFile" type="file" />
                </label>
                <label>
                  排序
                  <input defaultValue={project.sortOrder} name="sortOrder" step="1" type="number" />
                </label>
                <label>
                  状态
                  <select defaultValue={project.status} name="status">
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                    <option value="hidden">隐藏</option>
                  </select>
                </label>
              </div>

              <label>
                项目摘要
                <textarea defaultValue={project.summary} name="summary" required rows={3} />
              </label>
              <label>
                我的贡献
                <textarea defaultValue={project.contribution} name="contribution" rows={3} />
              </label>
              <label>
                AI 使用说明
                <textarea defaultValue={project.aiUsage} name="aiUsage" rows={3} />
              </label>
              <label>
                关键判断 / 取舍
                <textarea defaultValue={project.decisions} name="decisions" rows={3} />
              </label>
              <label>
                项目思考
                <textarea defaultValue={project.reflection} name="reflection" rows={3} />
              </label>
              <label>
                PRD Markdown
                <textarea className="admin-form__mono" defaultValue={project.prdMarkdown} name="prdMarkdown" rows={10} />
              </label>

              <div className="admin-form__checks">
                <label>
                  <input defaultChecked={project.isFeatured} name="isFeatured" type="checkbox" />
                  首页精选
                </label>
                <label>
                  <input defaultChecked={project.analyticsEnabled} name="analyticsEnabled" type="checkbox" />
                  记录项目交互数据
                </label>
              </div>

              <div className="admin-project-editor__actions">
                <button className="admin-button" type="submit">
                  保存修改
                </button>
              </div>
            </form>

            <form action={deleteProjectAction} className="admin-project-editor__delete">
              <input name="id" type="hidden" value={project.id} />
              <input name="slug" type="hidden" value={project.slug} />
              <ProjectDeleteButton projectTitle={project.title} />
            </form>
          </div>
        </details>
      </td>
    </tr>
  );
}

function statusLabel(status: Project["status"]) {
  if (status === "published") return "已发布";
  if (status === "hidden") return "隐藏";
  return "草稿";
}

function getStatusMessage(message: string | string[] | undefined) {
  const value = Array.isArray(message) ? message[0] : message;
  if (value === "saved") return { message: "项目已保存。", tone: "success" as const };
  if (value === "updated") return { message: "项目已更新。", tone: "success" as const };
  if (value === "deleted") return { message: "项目已删除，历史事件已保留。", tone: "success" as const };
  if (value === "invalid-input") return { message: "表单内容不完整或格式不正确，请检查必填项、URL 和封面文件。", tone: "error" as const };
  if (value === "save-failed") return { message: "保存失败，请稍后重试或检查 Supabase 配置。", tone: "error" as const };
  if (value === "delete-failed") return { message: "删除失败，请稍后重试。", tone: "error" as const };
  return null;
}

function StatusNotice({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <p className={`admin-status admin-status--${tone}`} role="status">
      {message}
    </p>
  );
}

function readRequiredFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.length === 0) {
    throw new AdminInputError(`Missing ${key}`);
  }

  return value;
}
