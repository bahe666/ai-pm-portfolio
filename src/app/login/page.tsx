import { redirect } from "next/navigation";
import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    email?: string | string[];
    message?: string | string[];
  }>;
};

const statusMessages: Record<string, { tone: "success" | "error"; text: string }> = {
  "auth-error": { tone: "error", text: "登录链接无效或已过期，请重新发送。" },
  "code-required": { tone: "error", text: "请输入邮箱里的 6 位验证码。" },
  "code-sent": { tone: "success", text: "验证码已发送，请查看邮箱并在下方输入。" },
  "email-required": { tone: "error", text: "请输入白名单邮箱。" },
  "email-not-allowed": { tone: "error", text: "该邮箱不在后台白名单中，请使用已配置的管理员邮箱。" },
  "login-unavailable": { tone: "error", text: "登录服务暂时不可用，请稍后再试。" },
  "send-failed": { tone: "success", text: "如果你已经收到验证码，请直接在下方输入；如果没有收到，请稍后再试。" },
  "verify-failed": { tone: "error", text: "验证码无效或已过期，请重新发送。" }
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = Array.isArray(params.message) ? params.message[0] : params.message;
  const email = normalizeEmailParam(params.email);
  const status = message ? statusMessages[message] : null;
  const showCodeForm = Boolean(
    email && (message === "code-sent" || message === "send-failed" || message === "code-required" || message === "verify-failed")
  );

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

        <form action={sendLoginCode} className="login-form">
          <label htmlFor="admin-email">邮箱</label>
          <input
            autoComplete="email"
            defaultValue={email}
            id="admin-email"
            name="email"
            placeholder="你的白名单邮箱"
            required
            spellCheck={false}
            type="email"
          />
          <button type="submit">发送验证码</button>
        </form>

        {showCodeForm ? (
          <form action={verifyLoginCode} className="login-form">
            <label htmlFor="admin-email-verify">邮箱</label>
            <input
              autoComplete="email"
              id="admin-email-verify"
              name="email"
              readOnly
              required
              spellCheck={false}
              type="email"
              value={email}
            />
            <label htmlFor="admin-token">验证码</label>
            <input
              autoComplete="one-time-code"
              id="admin-token"
              inputMode="numeric"
              maxLength={6}
              name="token"
              pattern="[0-9]{6}"
              placeholder="输入 6 位验证码"
              required
              type="text"
            />
            <button type="submit">验证并进入后台</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

async function sendLoginCode(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    redirect("/login?message=email-required");
  }

  if (!isAdminEmailConfigured(email)) {
    redirect(`/login?message=email-not-allowed&email=${encodeURIComponent(email)}`);
  }

  let nextMessage = "code-sent";

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    nextMessage = error ? "send-failed" : "code-sent";
  } catch {
    nextMessage = "login-unavailable";
  }

  redirect(`/login?message=${nextMessage}&email=${encodeURIComponent(email)}`);
}

async function verifyLoginCode(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").trim();

  if (!email) {
    redirect("/login?message=email-required");
  }

  if (!isAdminEmailConfigured(email)) {
    redirect(`/login?message=email-not-allowed&email=${encodeURIComponent(email)}`);
  }

  if (!token) {
    redirect(`/login?message=code-required&email=${encodeURIComponent(email)}`);
  }

  let verified = false;
  let nextMessage = "verify-failed";

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email"
    });

    verified = !error;
  } catch {
    nextMessage = "login-unavailable";
  }

  if (!verified) {
    redirect(`/login?message=${nextMessage}&email=${encodeURIComponent(email)}`);
  }

  redirect("/admin");
}

function normalizeEmailParam(value: string | string[] | undefined) {
  const email = Array.isArray(value) ? value[0] : value;
  return email?.trim().toLowerCase() ?? "";
}

function isAdminEmailConfigured(email: string) {
  try {
    return isAllowedAdminEmail(email);
  } catch {
    return false;
  }
}
