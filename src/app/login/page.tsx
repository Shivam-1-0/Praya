import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { PrayaMark } from "@/components/PrayaMark";
import { sendMagicLink } from "./actions";

type SearchParams = { sent?: string; error?: string; next?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        {/* Espresso hero card — the one dramatic dark moment. */}
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-8 py-12 text-background">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% -10%, rgba(232,183,118,0.18), transparent 60%)",
            }}
          />

          <div className="relative text-center">
            <PrayaMark width={62} className="mx-auto text-accent" />

            <h1 className="mt-8 font-serif text-4xl font-normal tracking-tight text-background">
              Welcome back.
            </h1>
            <p className="mt-1 font-serif text-lg italic text-muted-foreground">
              Your day is waiting.
            </p>

            {params.sent ? (
              <div className="mt-8 rounded-xl border border-accent/25 bg-background/5 p-4 text-left text-sm text-background/90">
                Check{" "}
                <span className="font-medium text-accent">{params.sent}</span> for
                your magic link. It expires in 10 minutes.
              </div>
            ) : (
              <form action={sendMagicLink} className="mt-8 space-y-3 text-left">
                <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-background/5 px-4 py-3 transition-colors focus-within:border-accent/60">
                  <Mail size={16} className="shrink-0 text-muted-foreground" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@example.com"
                    className="w-full bg-transparent text-sm text-background placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <input
                  type="hidden"
                  name="next"
                  value={params.next ?? "/today"}
                />
                {params.error ? (
                  <p className="text-sm text-destructive">{params.error}</p>
                ) : null}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  Send magic link
                  <ArrowRight size={15} />
                </button>
                <p className="pt-2 text-center text-[11px] text-muted-foreground">
                  No password. We&apos;ll email you a link.
                </p>
              </form>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
