import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-2xl font-semibold tracking-[0.2em] text-primary uppercase">Praya</h1>
      <p className="text-sm text-muted-foreground">Plan. Execute. Reflect. Review. Improve.</p>
      <Button render={<Link href="/login" />} nativeButton={false} className="mt-2">
        Sign in
      </Button>
    </div>
  );
}
