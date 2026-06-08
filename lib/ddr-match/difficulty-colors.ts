export const DIFFICULTY_COLORS = [
  "green",
  "blue",
  "yellow",
  "red",
  "purple",
] as const;

export type DifficultyColor = (typeof DIFFICULTY_COLORS)[number];

/** Arcade results-screen grade panel border colors (cabinet-specific mapping). */
export const DIFFICULTY_COLOR_LEGEND: Record<
  DifficultyColor,
  { label: string; difficulties: string[] }
> = {
  blue: {
    label: "Basic",
    difficulties: ["Basic", "(?) Basic", "(?) Basic (unused)"],
  },
  yellow: {
    label: "Basic",
    difficulties: ["Basic", "(?) Basic", "(?) Basic (unused)"],
  },
  red: {
    label: "Difficult",
    difficulties: ["Difficult", "(?) Difficult", "(?) Difficult (unused)"],
  },
  green: {
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
