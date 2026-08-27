import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PrayaMark } from "@/components/PrayaMark";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm text-center">
        <PrayaMark width={76} className="mx-auto text-primary" />
        <h1 className="mt-10 font-serif text-5xl font-normal leading-[1.05] tracking-tight md:text-6xl">
          Plan. Execute.
          <br />
          <span className="italic text-primary">Reflect.</span>
        </h1>
        <p className="mt-4 font-serif text-lg italic text-muted-foreground">
          A quiet ritual for the day you meant to have.
        </p>

        <Link
          href="/login"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          Sign in
          <ArrowRight size={15} className="text-accent" />
        </Link>
      </div>
    </main>
  );
}
