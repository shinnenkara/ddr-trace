"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";
import {
  formatArcadeScore,
  formatPlayDate,
} from "@/lib/user-played-songs/format-play";
import { useDictionary, useLocale } from "@/lib/i18n/dictionary-provider";
import type { UserPlayedSong } from "@/lib/db/schema";

type ChartPoint = {
  id: number;
  playedAt: string;
  playedAtLabel: string;
  arcadeScore: number;
  isHighlighted: boolean;
};

type Props = {
  history: UserPlayedSong[];
  highlightedPlayId: number;
  personalBest: number;
};

const chartConfig = {
  arcadeScore: {
    label: "Score",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function ScoreProgressChart({
  history,
  highlightedPlayId,
  personalBest,
}: Props) {
  const dict = useDictionary();
  const locale = useLocale();

  const data: ChartPoint[] = history.map((play) => ({
    id: play.id,
    playedAt: play.playedAt.toISOString(),
    playedAtLabel: formatPlayDate(play.playedAt, locale),
    arcadeScore: play.arcadeScore,
    isHighlighted: play.id === highlightedPlayId,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="playedAtLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          domain={[0, MAX_ARCADE_SCORE]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => formatArcadeScore(Number(value))}
          width={72}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="playedAtLabel"
              formatter={(value) => formatArcadeScore(Number(value))}
            />
          }
        />
        <ReferenceLine
          y={personalBest}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          label={{
            value: dict.track.detail.personalBest,
            position: "insideTopRight",
            fill: "hsl(var(--muted-foreground))",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="arcadeScore"
          stroke="var(--color-arcadeScore)"
          strokeWidth={2}
          dot={({ cx, cy, payload }) => {
            const point = payload as ChartPoint;
            const radius = point.isHighlighted ? 6 : 3;
            const fill = point.isHighlighted
              ? "hsl(var(--primary))"
              : "var(--color-arcadeScore)";

            if (cx == null || cy == null) {
              return null;
            }

            return (
              <circle
                key={point.id}
                cx={cx}
                cy={cy}
                r={radius}
                fill={fill}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
