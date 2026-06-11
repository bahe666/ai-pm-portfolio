import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    message?: string | string[];
  }>;
};

const statusMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  "auth-error": { tone: "error", text: "登录链接无效或已过期，请重新发送。" },
  "check-email": { tone: "success", text: "登录链接已发送，请检查邮箱。" },
  "email-required": { tone: "error", text: "请输入白名单邮箱。" },
  "login-unavailable": { tone: "error", text: "登录服务暂时不可用，请稍后再试。" },
  "send-failed": { tone: "error", text: "登录链接发送失败，请确认邮箱后重试。" }
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = Array.isArray(params.message) ? params.message[0] : params.message;
  const status = message ? statusMessages[message] : null;

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="eyebrow">Admin Access</p>
        <h1 id="login-title">后台登录</h1>
        <p className="login-panel__intro">只允许白名单邮箱登录，不开放注册。</p>

        {status ? (
          <p className={`login-status login-status--${status.tone}`} role="status">
            {status.text}
          </p>
        ) : null}

        <form action={sendLoginLink} className="login-form">
          <label htmlFor="admin-email">邮箱</label>
          <input id="admin-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          <button type="submit">发送登录链接</button>
        </form>
      </section>
    </main>
  );
}

async function sendLoginLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/login?message=email-required");
  }

  let nextMessage = "check-email";

  try {
    const supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const emailRedirectTo = new URL("/auth/callback", siteUrl).toString();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: false
      }
    });

    nextMessage = error ? "send-failed" : "check-email";
  } catch {
    nextMessage = "login-unavailable";
  }

  redirect(`/login?message=${nextMessage}`);
}
