"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutBottomIcon, Logout02Icon } from "@hugeicons/core-free-icons"

import { signOut, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?"
  return source.slice(0, 2).toUpperCase()
}

export function SiteHeader() {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const user = session?.user

  async function handleSignOut() {
    await signOut()
    toast.success("Signed out.")
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HugeiconsIcon
              icon={LayoutBottomIcon}
              strokeWidth={2}
              className="size-4"
            />
          </div>
          DDR Trace
        </Link>

        <div className="flex items-center gap-2">
          {isPending ? (
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                  <Avatar>
                    {user.image ? (
                      <AvatarImage src={user.image} alt={user.name ?? ""} />
                    ) : null}
                    <AvatarFallback>
                      {initials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <HugeiconsIcon
                    icon={Logout02Icon}
                    strokeWidth={2}
                    className="size-4"
                  />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="lg" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
