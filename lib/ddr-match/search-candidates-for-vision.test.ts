import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SongVariantWithSong } from "@/lib/db/schema";
import { makeStageVision } from "./test-helpers";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/db";
import {
  searchCandidatesForVision,
  searchSongsByTerms,
} from "./search-candidates-for-vision";

function makeVariant(
  overrides: Partial<SongVariantWithSong> &
    Pick<SongVariantWithSong, "id" | "song">,
): SongVariantWithSong {
  return {
    songId: 1,
    type: "double",
    difficulty: "Difficult",
    rating: 9,
    notes: 0,
    steps: 0,
    jumps: 0,
    holds: 0,
    shock_arrows: 0,
    max_combo_steps_shock_arrows: 0,
    ...overrides,
  };
}

describe("searchSongsByTerms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries double variants with instr-based title search", async () => {
    const luminous = makeVariant({
      id: 1,
      song: {
        id: 10,
        folder: "folder",
        title: "ルミナスデイズ | Luminous days",
        artist: "Artist",
        song_length: 90,
        display_bpm_min: 140,
        display_bpm_max: 140,
        bpm_changes: 0,
      },
    });

    const limit = vi.fn().mockResolvedValue([{ variant: luminous, song: luminous.song }]);
    const where = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });

    vi.mocked(getDb).mockResolvedValue({ select } as never);

    const term = "おーまい！らぶりー！すうぃーてぃ！だーりん！";
    const results = await searchSongsByTerms([term], "double");

    expect(select).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("double");
    expect(results[0].song.title).toContain("ルミナスデイズ");
  });
});

describe("searchCandidatesForVision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches each stage independently", async () => {
    const stage1Song = {
      id: 10,
      folder: "folder",
      title: "ルミナスデイズ | Luminous days",
      artist: "Artist",
      song_length: 90,
      display_bpm_min: 140,
      display_bpm_max: 140,
      bpm_changes: 0,
    };
    const stage2Song = {
      id: 20,
      folder: "folder",
      title:
        "おーまい！らぶりー！すうぃーてぃ！だーりん！ | Oh my! lovely! sweety! darling!",
      artist: "Artist",
      song_length: 90,
      display_bpm_min: 140,
      display_bpm_max: 140,
      bpm_changes: 0,
    };

    const responses = [
      [{ variant: makeVariant({ id: 1, song: stage1Song }), song: stage1Song }],
      [{ variant: makeVariant({ id: 2, song: stage2Song }), song: stage2Song }],
      [],
    ];
    let callIndex = 0;

    const limit = vi.fn().mockImplementation(() => {
      const rows = responses[callIndex] ?? [];
      callIndex += 1;
      return Promise.resolve(rows);
    });
    const where = vi.fn().mockReturnValue({ limit });
    const innerJoin = vi.fn().mockReturnValue({ where });
    const from = vi.fn().mockReturnValue({ innerJoin });
    const select = vi.fn().mockReturnValue({ from });

    vi.mocked(getDb).mockResolvedValue({ select } as never);

    const grouped = await searchCandidatesForVision(
      [
        makeStageVision({
          stage: 1,
          title_candidates: [
            { title: "ルミナスデイズ", confidence: 0.95, short_reason: "clear" },
          ],
        }),
        makeStageVision({
          stage: 2,
          title_candidates: [
            {
              title: "おーまい！らぶりー！すうぃーてぃ！だーりん！",
              confidence: 0.9,
              short_reason: "long title",
            },
          ],
        }),
        makeStageVision({
          stage: 3,
          title_candidates: [
            { title: "ですとろいやー", confidence: 0.8, short_reason: "ocr" },
          ],
        }),
      ],
      "double",
    );

    expect(callIndex).toBe(3);
    expect(grouped).toHaveLength(3);
    expect(grouped[0]).toHaveLength(1);
    expect(grouped[0][0].title).toContain("ルミナスデイズ");
    expect(grouped[1]).toHaveLength(1);
    expect(grouped[1][0].title).toContain("おーまい！らぶりー！");
    expect(grouped[2]).toEqual([]);
  });
});
