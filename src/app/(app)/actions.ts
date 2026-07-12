"use server";

import { getSupabaseServer } from "@/lib/supabase/server";

export async function syncTimezone(timezone: string) {
  if (!timezone) return;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ timezone })
    .eq("user_id", user.id)
    .neq("timezone", timezone);
}
