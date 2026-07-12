import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/today";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { ApiKeysPanel } from "./ApiKeysPanel";
import { ReflectionsExport, type ReflectionRow } from "./ReflectionsExport";

export default async function ProfilePage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("user_id", user!.id)
    .single();

  const today = getTodayInTimezone(profile?.timezone ?? "UTC");

  const [{ data: keys }, { data: reviews }, { data: reviewItems }, { data: habits }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("api_keys")
        .select("id, name, key_prefix, last_used_at, created_at")
        .eq("user_id", user!.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("day_reviews")
        .select("id, review_date, satisfaction_rating, reflection_text, day_score")
        .eq("user_id", user!.id)
        .not("completed_at", "is", null)
        .lte("review_date", today)
        .order("review_date", { ascending: false }),
      supabase
        .from("day_review_items")
        .select("day_review_id, item_type, item_id, reason_text, is_valid")
        .eq("user_id", user!.id),
      supabase
        .from("habits")
        .select("id, title")
        .eq("user_id", user!.id),
      supabase
        .from("tasks")
        .select("id, title")
        .eq("user_id", user!.id),
    ]);

  const habitTitles = new Map((habits ?? []).map((h) => [h.id, h.title]));
  const taskTitles = new Map((tasks ?? []).map((t) => [t.id, t.title]));
  const itemsByReview = new Map<string, ReflectionRow["items"]>();
  for (const it of reviewItems ?? []) {
    const title =
      it.item_type === "habit"
        ? habitTitles.get(it.item_id)
        : taskTitles.get(it.item_id);
    if (!title) continue; // Skip items whose parent habit/task has been deleted.
    const list = itemsByReview.get(it.day_review_id) ?? [];
    list.push({
      kind: it.item_type,
      title,
      reason: it.reason_text,
      is_valid: it.is_valid,
    });
    itemsByReview.set(it.day_review_id, list);
  }

  const reflections: ReflectionRow[] = (reviews ?? []).map((r) => ({
    review_date: r.review_date,
    satisfaction_rating: r.satisfaction_rating,
    reflection_text: r.reflection_text,
    day_score: r.day_score != null ? Number(r.day_score) : null,
    items: itemsByReview.get(r.id) ?? [],
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        subtitle="Your account details and connected keys."
      />

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="mt-1 text-sm">{profile?.display_name || "Not set"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Timezone</dt>
            <dd className="mt-1 text-sm">{profile?.timezone}</dd>
          </div>
        </dl>
      </section>

      <ReflectionsExport reflections={reflections} />

      <ApiKeysPanel keys={keys ?? []} />

      <form action="/logout" method="post">
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
