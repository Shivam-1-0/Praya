import Link from "next/link";
import { ViewTransition } from "react";
import { User } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { BottomNav, SideNav } from "./AppNav";
import { TimezoneSync } from "./TimezoneSync";
import { VeylaFab } from "./VeylaFab";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, displayName } = await getSessionUser();

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <TimezoneSync />
      <SideNav name={displayName} email={user.email ?? ""} />
      <div className="min-w-0 flex-1">
        <header className="border-b border-border md:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
            <Link href="/today" className="font-serif text-xl italic text-primary">
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
          <ViewTransition>{children}</ViewTransition>
        </main>
      </div>
      <VeylaFab />
    </div>
  );
}
