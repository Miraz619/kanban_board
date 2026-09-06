"use client"

import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import type { ReactNode } from "react"

import { useAuth } from "../auth.context"

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
    }
  }, [isLoading, router, user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking authentication</span>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return children
}
