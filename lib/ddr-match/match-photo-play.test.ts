import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DdrCapture, StageVision } from "./ai-results-schema";
import type { Song } from "@/lib/db/schema";
import type { UserPlayedSong } from "@/lib/user-played-songs/user-played-song";

vi.mock("./get-ai-ddr-results", () => ({
  parseResultsScreenVision: vi.fn(),
  resolvePlaysFromCandidates: vi.fn(),
  throwAiError: vi.fn((message: string) => {
    throw new Error(message);
  }),
}));

vi.mock("./search-candidates-for-vision", () => ({
  searchCandidatesForVision: vi.fn(),
}));

vi.mock("@/lib/user-played-songs/search-songs-for-match", () => ({
  getSongsByIds: vi.fn(),
}));

vi.mock("@/lib/user-played-songs/insert-played-songs", () => ({
  insertPlayedSongs: vi.fn(),
}));

vi.mock("./log-match-failure", () => ({
  logPhotoMatchFailure: vi.fn(),
}));

import {
  parseResultsScreenVision,
  resolvePlaysFromCandidates,
} from "./get-ai-ddr-results";
import { searchCandidatesForVision } from "./search-candidates-for-vision";
import { getSongsByIds } from "@/lib/user-played-songs/search-songs-for-match";
import { insertPlayedSongs } from "@/lib/user-played-songs/insert-played-songs";
import { confirmPhotoMatchPlays, matchPhotoPlay } from "./match-photo-play";

const capture: DdrCapture = {
  user_id: "user-1",
  capture_base64: "data:image/jpeg;base64,abc",
  name: "photo.jpg",
  mime: "image/jpeg",
  chart_type: "single",
  player_side: "right",
  played_at: new Date("2026-06-07T12:00:00.000Z"),
};

const mockSong = {
  id: 42,
  title: "Test Song",
  artist: "Artist",
  difficulty: "Difficult",
  rating: 9,
} as Song;

const mockPlay = {
  id: 1,
  userId: capture.user_id,
  songId: 42,
  arcadeScore: 837760,
  stage: 1,
  batchId: "batch-1",
  playedAt: capture.played_at,
  source: "photo",
} as UserPlayedSong;

const stage: StageVision = {
  stage: 1,
  title_candidates: [
    { title: "Test Song", confidence: 0.9, short_reason: "clear" },
  ],
  score_layout: "single",
  left_score: null,
  right_score: 837760,
  arcade_score: 837760,
  score_confidence: 0.95,
  score_side: "right",
  score_side_confidence: 1,
  score_selection_reason: "user specified right",
  difficulty_color: "yellow",
};

describe("matchPhotoPlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parseResultsScreenVision).mockResolvedValue({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "partial",
      stages: [stage],
    });
    vi.mocked(searchCandidatesForVision).mockResolvedValue([
      [
        {
          song_id: 42,
          title: "Test Song",
          artist: "Artist",
          difficulty: "Difficult",
          rating: 9,
        },
      ],
    ]);
  });

  it("auto-logs when overall confidence is high", async () => {
    vi.mocked(resolvePlaysFromCandidates).mockResolvedValue({
      plays: [
        {
          song_id: 42,
          stage: 1,
          arcade_score: 837760,
          match_reason: "title match",
          resolve_confidence: 0.95,
        },
      ],
    });
    vi.mocked(getSongsByIds).mockResolvedValue([mockSong]);
    vi.mocked(insertPlayedSongs).mockResolvedValue([mockPlay]);

    const outcome = await matchPhotoPlay(capture);

    expect(outcome.mode).toBe("logged");
    if (outcome.mode === "logged") {
      expect(outcome.result.plays).toHaveLength(1);
    }
    expect(insertPlayedSongs).toHaveBeenCalledOnce();
  });

  it("returns preview when overall confidence is low", async () => {
    vi.mocked(resolvePlaysFromCandidates).mockResolvedValue({
      plays: [
        {
          song_id: 42,
          stage: 1,
          arcade_score: 837760,
          match_reason: "weak match",
          resolve_confidence: 0.4,
        },
      ],
    });
    vi.mocked(getSongsByIds).mockResolvedValue([mockSong]);

    const outcome = await matchPhotoPlay(capture);

    expect(outcome.mode).toBe("preview");
    if (outcome.mode === "preview") {
      expect(outcome.rows).toHaveLength(1);
      expect(outcome.rows[0].songId).toBe(42);
      expect(outcome.overallConfidence).toBeLessThan(0.6);
    }
    expect(insertPlayedSongs).not.toHaveBeenCalled();
  });

  it("auto-logs low confidence when forceAutoLog is set", async () => {
    vi.mocked(resolvePlaysFromCandidates).mockResolvedValue({
      plays: [
        {
          song_id: 42,
          stage: 1,
          arcade_score: 837760,
          match_reason: "weak match",
          resolve_confidence: 0.4,
        },
      ],
    });
    vi.mocked(getSongsByIds).mockResolvedValue([mockSong]);
    vi.mocked(insertPlayedSongs).mockResolvedValue([mockPlay]);

    const outcome = await matchPhotoPlay(capture, { forceAutoLog: true });

    expect(outcome.mode).toBe("logged");
    expect(insertPlayedSongs).toHaveBeenCalledOnce();
  });
});

describe("confirmPhotoMatchPlays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates song ids and inserts confirmed rows", async () => {
    vi.mocked(getSongsByIds).mockResolvedValue([mockSong]);
    vi.mocked(insertPlayedSongs).mockResolvedValue([mockPlay]);

    const result = await confirmPhotoMatchPlays(
      { user_id: capture.user_id, played_at: capture.played_at },
      [
        {
          stage: 1,
          songId: 42,
          title: "Test Song",
          artist: "Artist",
          difficulty: "Difficult",
          arcadeScore: 837760,
          resolveConfidence: 0.4,
        },
      ],
    );

    expect(result.plays).toHaveLength(1);
    expect(insertPlayedSongs).toHaveBeenCalledOnce();
  });

  it("throws when a confirmed song id is missing from the database", async () => {
    vi.mocked(getSongsByIds).mockResolvedValue([]);

    await expect(
      confirmPhotoMatchPlays(
        { user_id: capture.user_id, played_at: capture.played_at },
        [
          {
            stage: 1,
            songId: 42,
            title: "Test Song",
            artist: "Artist",
            difficulty: "Difficult",
            arcadeScore: 837760,
            resolveConfidence: 0.4,
          },
        ],
      ),
    ).rejects.toThrow("Song id 42 was not found in database");
  });
});
