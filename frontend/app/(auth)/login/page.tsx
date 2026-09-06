import type { Metadata } from "next"

import { LoginForm } from "@/modules/auth/components/login-form"

export const metadata: Metadata = {
  title: "Log in | Kanban Board",
}

export default function LoginPage() {
  return <LoginForm />
}
