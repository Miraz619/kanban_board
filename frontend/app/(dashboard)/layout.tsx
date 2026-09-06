import type { ReactNode } from "react"

import { DashboardHeader } from "@/components/layout/dashboard-header"
import { ProtectedRoute } from "@/modules/auth/components/protected-route"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted/20">
        <DashboardHeader />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </ProtectedRoute>
  )
}
