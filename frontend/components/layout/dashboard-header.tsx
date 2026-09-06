"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/modules/auth/auth.context"
import { AppLogo } from "./app-logo"

export function DashboardHeader() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      toast.success("Logged out successfully")
      router.replace("/login")
    } catch {
      toast.error("Could not log out. Please try again.")
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <AppLogo href="/boards" />

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut />
            {isLoggingOut ? "Logging out..." : "Log out"}
          </Button>
        </div>
      </div>
    </header>
  )
}
