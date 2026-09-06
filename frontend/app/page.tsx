import { ArrowRight, GripVertical, Share2, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { AppLogo } from "@/components/layout/app-logo"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: GripVertical,
    title: "Simple task movement",
    description: "Reorder tasks or move them between workflow columns.",
  },
  {
    icon: Share2,
    title: "Built for collaboration",
    description: "Share boards with registered teammates as editors or viewers.",
  },
  {
    icon: ShieldCheck,
    title: "Access controlled",
    description: "Every board, column, and task operation is checked by the API.",
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <AppLogo />
          <nav className="flex items-center gap-2" aria-label="Authentication">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--color-primary)_0,transparent_35%)] opacity-10" />
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
            A focused workspace for your team
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
            Move work forward,
            <span className="block text-muted-foreground">one task at a time.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Create boards, organize clear workflows, and collaborate without
            losing track of what comes next.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Create your first board
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I already have an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/20 px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-xl border bg-card p-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <feature.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
