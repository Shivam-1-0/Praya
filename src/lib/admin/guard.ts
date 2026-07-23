import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

// Guard for every (admin) surface. Uses the anon client + RLS (a user can only
// read their own profile row). Redirects non-admins to /today. Returns the
// admin user so pages don't have to refetch.
export async function requireAdmin() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/today");

  return { user, displayName: profile.display_name as string | null };
}
