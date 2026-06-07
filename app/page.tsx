import { Suspense } from "react";
import { getSongsPage, parseSongsQuery } from "../lib/db/queries";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { SongsTable } from "./_components/songs-table";

type HomeProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sort?: string;
    order?: string;
    q?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const query = parseSongsQuery(await searchParams);
  const songs = await getSongsPage(query);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-4">
          <span className="w-fit rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            {dict.home.badge}
          </span>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            {dict.home.title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {dict.home.description}
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <Suspense fallback={null}>
            <SongsTable
              data={songs.rows}
              total={songs.total}
              page={songs.page}
              pageSize={songs.pageSize}
              pageCount={songs.pageCount}
              sort={songs.sort}
              order={songs.order}
              q={songs.q}
            />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
