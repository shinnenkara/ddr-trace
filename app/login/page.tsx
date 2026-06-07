import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutBottomIcon } from "@hugeicons/core-free-icons"
import { getDictionary } from "@/lib/i18n/get-dictionary"
import { getLocale } from "@/lib/i18n/get-locale"
import { hasStaleSessionCookie } from "@/lib/auth/clear-stale-session-cookie"

export default async function LoginPage() {
  if (await hasStaleSessionCookie()) {
    redirect("/api/auth/clear-stale-session")
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HugeiconsIcon
              icon={LayoutBottomIcon}
              strokeWidth={2}
              className="size-4"
            />
          </div>
          {dict.common.appName}
        </Link>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
