import Link from "next/link";
import { sendMagicLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchParams = { sent?: string; error?: string; next?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen flex-col justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="mb-10 flex items-center justify-center">
          <span className="text-lg font-semibold tracking-[0.2em] text-primary uppercase">
            Praya
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ll email you a magic link. No password needed.
          </p>

          {params.sent ? (
            <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm">
              Check <span className="font-medium text-foreground">{params.sent}</span>{" "}
              for your magic link. It expires in 10 minutes.
            </div>
          ) : (
            <form action={sendMagicLink} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              <input type="hidden" name="next" value={params.next ?? "/today"} />
              {params.error ? (
                <p className="text-sm text-destructive">{params.error}</p>
              ) : null}
              <Button type="submit" className="w-full">
                Send magic link
              </Button>
            </form>
          )}
        </div>

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
