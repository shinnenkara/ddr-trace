"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const [loading, setLoading] = useState(false)

  async function resend() {
    if (!email) {
      toast.error("No email address to resend to.")
      return
    }
    setLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/",
    })
    setLoading(false)

    if (error) {
      toast.error(error.message || "Could not resend the email.")
      return
    }
    toast.success("Verification email sent.")
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a verification link{email ? ` to ${email}` : ""}. Click it to
          activate your account, then sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button onClick={resend} disabled={loading} variant="outline">
          {loading ? "Sending…" : "Resend verification email"}
        </Button>
        <Button asChild>
          <Link href="/login">Back to sign in</Link>
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
