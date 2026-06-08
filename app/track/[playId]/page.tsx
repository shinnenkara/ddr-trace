import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api/get-session-user";
import { getPlayById } from "@/lib/user-played-songs/get-play-by-id";
import { getChartPlayHistory } from "@/lib/user-played-songs/get-chart-play-history";
import { PlayDetailClient } from "./_components/play-detail-client";

type Props = {
  params: Promise<{ playId: string }>;
};

export const dynamic = "force-dynamic";

export default async function PlayDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/track");
  }

  const { playId: playIdParam } = await params;
  const playId = Number(playIdParam);
  if (!Number.isInteger(playId) || playId <= 0) {
    notFound();
  }

  const play = await getPlayById(playId, user.id);
  if (!play) {
    notFound();
  }

  const history = await getChartPlayHistory(user.id, play.songId);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10">
      <PlayDetailClient play={play} history={history} />
    </main>
  );
}
