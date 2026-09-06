import { AppLogo } from "@/components/layout/app-logo"
import type { ReactNode } from "react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)_0,transparent_24%)] opacity-10" />

      <div className="w-full max-w-md space-y-6">
        <AppLogo className="mx-auto" />
        {children}
      </div>
    </main>
  )
}
