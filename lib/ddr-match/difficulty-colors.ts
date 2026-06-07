export const DIFFICULTY_COLORS = [
  "green",
  "blue",
  "yellow",
  "red",
  "purple",
] as const;

export type DifficultyColor = (typeof DIFFICULTY_COLORS)[number];

/** Modern DDR difficulty colors on the results screen. */
export const DIFFICULTY_COLOR_LEGEND: Record<
  DifficultyColor,
  { label: string; difficulties: string[] }
> = {
  green: {
    label: "Beginner",
    difficulties: ["Beginner", "(?) Beginner", "(?) Beginner (unused)"],
  },
  blue: {
    label: "Basic",
    difficulties: ["Basic", "(?) Basic", "(?) Basic (unused)"],
  },
  yellow: {
    label: "Difficult",
    difficulties: ["Difficult", "(?) Difficult", "(?) Difficult (unused)"],
  },
  red: {
    label: "Expert",
    difficulties: ["Expert", "(?) Expert", "(?) Expert (unused)"],
  },
  purple: {
    label: "Challenge",
    difficulties: ["Challenge", "(?) Challenge", "(?) Challenge (unused)"],
  },
};

export function difficultyColorToLabels(color: DifficultyColor): string[] {
  return DIFFICULTY_COLOR_LEGEND[color].difficulties;
}

export function difficultyColorLegendForPrompt(): string {
  return Object.entries(DIFFICULTY_COLOR_LEGEND)
    .map(([color, { label }]) => `- ${label}: ${color}`)
    .join("\n");
}
