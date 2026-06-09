import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

export type PreviewDifficultyOption = {
  songId: number;
  difficulty: string;
  rating: number;
};

export type PreviewPlayRow = {
  stage: 1 | 2 | 3;
  songId: number;
  title: string;
  artist: string;
  difficulty: string;
  arcadeScore: number;
  resolveConfidence: number;
  difficultyOptions: PreviewDifficultyOption[];
  visionTitle?: string;
  playedAt?: string;
};

export type PhotoMatchOutcome =
  | { mode: "logged"; result: LogPlayResult }
  | {
      mode: "preview";
      rows: PreviewPlayRow[];
      overallConfidence: number;
    };
