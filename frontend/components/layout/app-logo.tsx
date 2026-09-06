import { PanelsTopLeft } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

interface AppLogoProps {
  className?: string
  href?: string
}

export function AppLogo({ className, href = "/" }: AppLogoProps) {
  return (
    <Link
      href={href}
      className={cn("flex w-fit items-center gap-2 text-lg font-semibold", className)}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <PanelsTopLeft className="size-5" />
      </span>
      Kanban Board
    </Link>
  )
}
