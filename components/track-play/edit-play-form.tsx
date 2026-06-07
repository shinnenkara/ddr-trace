"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { formatDifficulty, formatSongType } from "@/lib/i18n/song-labels";
import { toDatetimeLocalValue } from "@/lib/user-played-songs/format-play";
import type { PlayWithSong } from "@/lib/user-played-songs/play-with-song";

type Props = {
  play: PlayWithSong;
};

export function EditPlayForm({ play }: Props) {
  const dict = useDictionary();

  return (
    <>
      <input type="hidden" name="play_id" value={play.id} />

      <div className="grid gap-2">
        <Label>{dict.track.edit.chart}</Label>
        <p className="text-sm text-muted-foreground">
          {play.song.title} — {play.song.artist} ·{" "}
          {formatSongType(play.song.type, dict)} ·{" "}
          {formatDifficulty(play.song.difficulty, dict)} · ★{play.song.rating}
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="arcade_score">{dict.track.edit.scoreLabel}</Label>
        <Input
          id="arcade_score"
          name="arcade_score"
          type="number"
          min={0}
          max={1000000}
          defaultValue={play.arcadeScore}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ex_score">{dict.track.edit.exScoreLabel}</Label>
        <Input
          id="ex_score"
          name="ex_score"
          type="number"
          min={0}
          defaultValue={play.exScore ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="stage">{dict.track.edit.stageLabel}</Label>
          <Input
            id="stage"
            name="stage"
            type="number"
            min={1}
            max={3}
            defaultValue={play.stage ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="speed_modifier">{dict.track.edit.speedLabel}</Label>
          <Input
            id="speed_modifier"
            name="speed_modifier"
            defaultValue={play.speedModifier ?? ""}
            maxLength={20}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="played_at">{dict.track.edit.playedAtLabel}</Label>
        <Input
          id="played_at"
          name="played_at"
          type="datetime-local"
          defaultValue={toDatetimeLocalValue(play.playedAt)}
          required
        />
      </div>
    </>
  );
}
