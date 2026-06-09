export type PreviewSongOption = {
  songDbId: number;
  title: string;
  artist: string;
  matchScore: number;
  /** Set when the user picked this song via manual search. */
  manual?: boolean;
};

export type PreviewDifficultyOption = {
  songId: number;
  difficulty: string;
  rating: number;
  suggested?: boolean;
};

import type { DifficultyColor } from "./difficulty-colors";

export type PreviewPlayRow = {
  stage: 1 | 2 | 3;
  songDbId: number;
  title: string;
  artist: string;
  songOptions: PreviewSongOption[];
  songId: number;
  difficulty: string;
  difficultyOptions: PreviewDifficultyOption[];
  arcadeScore: number;
  matchScore: number;
  matchSource: "ranked" | "manual";
  suggestedDifficultyColor?: DifficultyColor | null;
  visionTitle?: string;
  playedAt?: string;
};

export type PhotoMatchOutcome = {
  rows: PreviewPlayRow[];
  overallConfidence: number;
};
