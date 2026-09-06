import { SearchX } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <SearchX className="size-12 text-muted-foreground" />
      <h1 className="mt-5 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you requested does not exist or is no longer available.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">Return home</Link>
      </Button>
    </main>
  )
}
