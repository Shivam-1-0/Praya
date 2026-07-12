import Link from "next/link";
import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "./AppNav";
import { TimezoneSync } from "./TimezoneSync";
import { VeylaFab } from "./VeylaFab";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <TimezoneSync />
      <SideNav name={profile?.display_name ?? null} email={user.email ?? ""} />
      <div className="min-w-0 flex-1">
        <header className="border-b border-border md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
            <Link href="/today" className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
              Praya
            </Link>
            <Link
              href="/profile"
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              <User size={16} strokeWidth={1.75} />
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-md px-5 pt-6 pb-24 md:max-w-4xl md:px-10 md:py-10">
          {children}
        </main>
      </div>
      <VeylaFab />
    </div>
  );
}
