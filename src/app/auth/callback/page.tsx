"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "error">("pending");

  useEffect(() => {
    let cancelled = false;

    async function finalize() {
      const url = new URL(window.location.href);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : "";
      const code = url.searchParams.get("code");
      const errorParam =
        url.searchParams.get("error_description") || new URLSearchParams(hash).get("error_description");

      if (errorParam) {
        if (!cancelled) {
          setStatus("error");
          router.replace("/login?message=auth-error");
        }
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      try {
        if (hash) {
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (cancelled) return;
            if (error) {
              setStatus("error");
              router.replace("/login?message=auth-error");
              return;
            }
            window.location.replace("/admin");
            return;
          }
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setStatus("error");
            router.replace("/login?message=auth-error");
            return;
          }
          window.location.replace("/admin");
          return;
        }

        if (!cancelled) {
          setStatus("error");
          router.replace("/login?message=auth-error");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          router.replace("/login?message=login-unavailable");
        }
      }
    }

    finalize();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main style={{ padding: "4rem 2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
      {status === "error" ? <p>登录失败，正在返回登录页…</p> : <p>登录中…</p>}
    </main>
  );
}
