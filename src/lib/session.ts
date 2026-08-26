import { cache } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

// One shared, per-request memoized fetch of the signed-in user + profile row.
// React.cache dedupes identical calls within a single request, so the layout
// and every page it renders pay for at most ONE auth check + ONE profiles
// SELECT — not one pair per component. Free-tier Supabase RTT is the biggest
// slice of tab-switch latency; this collapses the two chained RTTs into one.
export const getSessionUser = cache(async () => {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("user_id", user.id)
    .single();

  return {
    supabase,
    user,
    displayName: profile?.display_name ?? null,
    timezone: profile?.timezone ?? "UTC",
  };
});
