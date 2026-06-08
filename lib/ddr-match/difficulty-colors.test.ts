import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_COLOR_LEGEND,
  difficultyColorLegendForPrompt,
  difficultyColorToLabels,
} from "./difficulty-colors";

describe("difficulty-colors", () => {
  it("maps arcade border colors to database difficulty labels", () => {
    expect(difficultyColorToLabels("blue")).toContain("Basic");
    expect(difficultyColorToLabels("yellow")).toContain("Basic");
    expect(difficultyColorToLabels("red")).toContain("Difficult");
    expect(difficultyColorToLabels("green")).toContain("Expert");
    expect(difficultyColorToLabels("purple")).toContain("Challenge");
  });

  it("does not map red to Expert or yellow to Difficult", () => {
    expect(difficultyColorToLabels("red")).not.toContain("Expert");
    expect(difficultyColorToLabels("yellow")).not.toContain("Difficult");
    expect(difficultyColorToLabels("green")).not.toContain("Beginner");
  });

  it("includes all five border colors in the prompt legend", () => {
    const prompt = difficultyColorLegendForPrompt();
    for (const color of Object.keys(DIFFICULTY_COLOR_LEGEND)) {
      expect(prompt).toContain(`${color}`);
    }
    expect(prompt).toContain("Basic: blue");
    expect(prompt).toContain("Difficult: red");
    expect(prompt).toContain("Expert: green");
  });
});
