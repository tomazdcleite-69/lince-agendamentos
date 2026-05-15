import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseAuth } from "@/lib/supabase";

export const ADMIN_ACCESS_TOKEN_COOKIE = "lince_admin_access_token";
export const ADMIN_REFRESH_TOKEN_COOKIE = "lince_admin_refresh_token";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireAdminUser(returnTo = "/admin") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`);
  }

  return user;
}
