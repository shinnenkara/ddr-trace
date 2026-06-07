import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

export type PreviewPlayRow = {
  stage: 1 | 2 | 3;
  songId: number;
  title: string;
  artist: string;
  difficulty: string;
  arcadeScore: number;
  resolveConfidence: number;
  visionTitle?: string;
};

export type PhotoMatchOutcome =
  | { mode: "logged"; result: LogPlayResult }
  | {
      mode: "preview";
      rows: PreviewPlayRow[];
      overallConfidence: number;
    };
