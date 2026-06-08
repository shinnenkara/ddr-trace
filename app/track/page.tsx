import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/api/get-session-user";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { getUserPlays } from "@/lib/user-played-songs/get-user-plays";
import { PlaysEmptyState, PlaysTable } from "./_components/plays-table";

export const dynamic = "force-dynamic";

export default async function TrackPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/track");
  }

  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const { plays } = await getUserPlays(user.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {dict.track.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.track.description}
          </p>
        </div>
        <Button asChild>
          <Link href="/log">{dict.track.logPlay}</Link>
        </Button>
      </div>

      <div className="mt-8">
        {plays.length === 0 ? (
          <PlaysEmptyState />
        ) : (
          <PlaysTable plays={plays} />
        )}
      </div>
    </main>
  );
}
