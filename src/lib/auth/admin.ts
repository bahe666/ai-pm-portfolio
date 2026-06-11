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

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      redirect("/login");
    }

    user = data.user;
  } catch {
    redirect("/login");
  }

  if (!user || !isAdminUser(user)) {
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
