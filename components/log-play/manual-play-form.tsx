"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logPlayManualAction } from "@/lib/user-played-songs/log-play-manual-action";
import { searchSongsAction } from "@/lib/user-played-songs/search-songs-action";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { SongVariantWithSong } from "@/lib/db/schema";
import { formatDifficulty, formatSongType } from "@/lib/i18n/song-labels";

export function ManualPlayForm() {
  const dict = useDictionary();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<SongVariantWithSong[]>([]);
  const [selectedVariant, setSelectedVariant] =
    useState<SongVariantWithSong | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [state, action, pending] = useActionState(logPlayManualAction, {});

  useEffect(() => {
    if (!state.data) {
      return;
    }

    toast.success(dict.logPlay.manual.success, {
      action: {
        label: dict.logPlay.manual.viewPlays,
        onClick: () => router.push("/track"),
      },
    });
    setSelectedVariant(null);
    setQuery("");
  }, [dict.logPlay.manual.success, router, state.data]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setVariants([]);
      return;
    }

    const timer = setTimeout(() => {
      startSearch(async () => {
        const results = await searchSongsAction(query, 15);
        setVariants(results);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const playedAtDefault = new Date().toISOString().slice(0, 16);

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="song-search">{dict.logPlay.manual.searchLabel}</Label>
        <Input
          id="song-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={dict.logPlay.manual.searchPlaceholder}
          autoComplete="off"
        />
        {isSearching && (
          <p className="text-xs text-muted-foreground">
            {dict.logPlay.manual.searching}
          </p>
        )}
        {variants.length > 0 && !selectedVariant && (
          <ul className="max-h-48 overflow-y-auto rounded-md border">
            {variants.map((variant) => (
              <li key={variant.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    setSelectedVariant(variant);
                    setVariants([]);
                    setQuery(
                      `${variant.song.title} — ${variant.song.artist}`,
                    );
                  }}
                >
                  <span className="font-medium">{variant.song.title}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {variant.song.artist} ·{" "}
                    {formatSongType(variant.type, dict)} ·{" "}
                    {formatDifficulty(variant.difficulty, dict)} · ★
                    {variant.rating}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedVariant && (
          <p className="text-xs text-muted-foreground">
            {dict.logPlay.manual.selected}: {selectedVariant.song.title} (
            {formatDifficulty(selectedVariant.difficulty, dict)})
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                setSelectedVariant(null);
                setQuery("");
              }}
            >
              {dict.logPlay.manual.change}
            </button>
          </p>
        )}
        <input
          type="hidden"
          name="song_id"
          value={selectedVariant?.id ?? ""}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="arcade_score">{dict.logPlay.manual.scoreLabel}</Label>
        <Input
          id="arcade_score"
          name="arcade_score"
          type="number"
          min={0}
          max={1000000}
          required
          placeholder="1000000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="stage">{dict.logPlay.manual.stageLabel}</Label>
          <Input
            id="stage"
            name="stage"
            type="number"
            min={1}
            max={3}
            placeholder="1–3"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="speed_modifier">
            {dict.logPlay.manual.speedLabel}
          </Label>
          <Input
            id="speed_modifier"
            name="speed_modifier"
            placeholder="x1.0"
            maxLength={20}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="played_at">{dict.logPlay.manual.playedAtLabel}</Label>
        <Input
          id="played_at"
          name="played_at"
          type="datetime-local"
          defaultValue={playedAtDefault}
          required
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending || !selectedVariant}>
        {pending ? dict.logPlay.manual.submitting : dict.logPlay.manual.submit}
      </Button>
    </form>
  );
}
