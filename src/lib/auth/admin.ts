import { redirect } from "next/navigation";
import { getAdminEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function isAllowedAdminEmail(email: string | null | undefined, allowList = getAdminEmails()) {
  if (!email) return false;
  return allowList.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user || !isAllowedAdminEmail(user.email)) {
    redirect("/login");
  }

  return user;
}
