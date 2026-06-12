import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Save } from "lucide-react";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminInputError, getAdminProfile, updateProfile } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<{
    message?: string | string[];
  }>;
};

async function updateProfileAction(formData: FormData) {
  "use server";

  await requireAdmin();
  let message = "saved";

  try {
    await updateProfile({
      displayName: getString(formData, "displayName"),
      title: getString(formData, "title"),
      headline: getString(formData, "headline"),
      intro: getString(formData, "intro"),
      contact: parseContactJson(getString(formData, "contact")),
      resumeSnapshot: getLines(formData, "resumeSnapshot")
    });

    revalidatePath("/admin/profile");
    revalidatePath("/");
  } catch (error) {
    message =
      error instanceof z.ZodError || error instanceof SyntaxError || error instanceof AdminInputError
        ? "invalid-input"
        : "save-failed";
  }

  redirect(`/admin/profile?message=${message}`);
}

export default async function AdminProfilePage({ searchParams }: AdminPageProps) {
  const profile = await getAdminProfile();
  const statusMessage = getStatusMessage((await searchParams)?.message);

  return (
    <div className="admin-stack">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>经历摘要</h1>
          <p>维护公开首页的身份、开场介绍和简历摘要。这里不提供简历 PDF 下载入口。</p>
        </div>
        <div className="admin-kpi-grid" aria-label="资料概览">
          <div className="admin-kpi">
            <span>摘要条目</span>
            <strong>{profile.resumeSnapshot.length}</strong>
          </div>
          <div className="admin-kpi">
            <span>联系方式</span>
            <strong>{Object.keys(profile.contact).length}</strong>
          </div>
        </div>
      </header>
      {statusMessage ? <StatusNotice message={statusMessage.message} tone={statusMessage.tone} /> : null}

      <section className="admin-card" aria-labelledby="profile-current-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="profile-current-title">当前公开内容</h2>
            <p>这些内容会出现在公开作品集首页，供面试官快速理解候选人定位。</p>
          </div>
        </div>

        <dl className="admin-description-list">
          <div>
            <dt>姓名</dt>
            <dd>{profile.displayName}</dd>
          </div>
          <div>
            <dt>标题</dt>
            <dd>{profile.title}</dd>
          </div>
          <div>
            <dt>Headline</dt>
            <dd>{profile.headline}</dd>
          </div>
          <div>
            <dt>Intro</dt>
            <dd>{profile.intro}</dd>
          </div>
          <div>
            <dt>Resume Snapshot</dt>
            <dd>
              <ul className="admin-plain-list">
                {profile.resumeSnapshot.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>

      <section className="admin-card" aria-labelledby="profile-form-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="profile-form-title">更新资料</h2>
            <p>Contact 使用 JSON 对象保存，值保持为字符串；Resume Snapshot 每行一条。</p>
          </div>
        </div>

        <form action={updateProfileAction} className="admin-form">
          <div className="admin-form__grid">
            <label>
              Display Name
              <input defaultValue={profile.displayName} name="displayName" required />
            </label>
            <label>
              Title
              <input defaultValue={profile.title} name="title" required />
            </label>
          </div>
          <label>
            Headline
            <textarea defaultValue={profile.headline} name="headline" required rows={3} />
          </label>
          <label>
            Intro
            <textarea defaultValue={profile.intro} name="intro" required rows={4} />
          </label>
          <label>
            Contact JSON
            <textarea
              className="admin-form__mono"
              defaultValue={JSON.stringify(profile.contact, null, 2)}
              name="contact"
              rows={6}
            />
          </label>
          <label>
            Resume Snapshot
            <textarea defaultValue={profile.resumeSnapshot.join("\n")} name="resumeSnapshot" rows={6} />
          </label>
          <button className="admin-button" type="submit">
            <Save aria-hidden="true" size={17} />
            保存资料
          </button>
        </form>
      </section>
    </div>
  );
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getLines(formData: FormData, key: string) {
  return getString(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseContactJson(value: string) {
  if (!value) return {};

  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AdminInputError("Contact must be a JSON object");
  }

  return Object.fromEntries(
    Object.entries(parsed)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, contactValue]) => [key.trim(), contactValue.trim()])
      .filter(([key, contactValue]) => key && contactValue)
  );
}

function getStatusMessage(message: string | string[] | undefined) {
  const value = Array.isArray(message) ? message[0] : message;
  if (value === "saved") return { message: "资料已保存。", tone: "success" as const };
  if (value === "invalid-input") return { message: "表单内容不完整或格式不正确，请检查 Contact JSON 和必填项。", tone: "error" as const };
  if (value === "save-failed") return { message: "保存失败，请稍后重试或检查 Supabase 配置。", tone: "error" as const };
  return null;
}

function StatusNotice({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <p className={`admin-status admin-status--${tone}`} role="status">
      {message}
    </p>
  );
}
