import { redirect } from "next/navigation";
import { getAdminEmails } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export function isAllowedAdminEmail(email: string | null | undefined, allowList = getAdminEmails()) {
  if (!email) return false;
  return allowList.includes(email.toLowerCase());
}

export async function requireAdmin() {
  let user: User | null = null;
  let hasAuthError = false;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    hasAuthError = Boolean(error);
    user = data.user;
  } catch {
    hasAuthError = true;
  }

  if (hasAuthError || !user || !isAdminUser(user)) {
    redirect("/login");
  }

  return user;
}

function isAdminUser(user: User) {
  try {
    return isAllowedAdminEmail(user.email);
  } catch {
    return false;
  }
}
