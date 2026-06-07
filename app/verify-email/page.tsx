"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { useDictionary } from "@/lib/i18n/dictionary-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function VerifyEmailContent() {
  const dict = useDictionary()
  const t = dict.auth.verifyEmail
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const [loading, setLoading] = useState(false)

  const description = email
    ? t.description.replace(
        "{email}",
        t.descriptionWithEmail.replace("{email}", email),
      )
    : t.description.replace("{email}", "")

  async function resend() {
    if (!email) {
      toast.error(t.noEmail)
      return
    }
    setLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    })
    setLoading(false)

    if (error) {
      toast.error(error.message || t.resendError)
      return
    }
    toast.success(t.resendSuccess)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{t.title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={resend} disabled={loading} variant="outline">
          {loading ? t.resending : t.resend}
        </Button>
        <Button asChild>
          <Link href="/login">{t.backToSignIn}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
