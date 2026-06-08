import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "get-ai-ddr-results.ts"),
  "utf8",
);

describe("get-ai-ddr-results vision prompt", () => {
  it("asks for difficulty_border hypotheses with short_reason", () => {
    expect(source).toContain("difficulty_border");
    expect(source).toContain("short_reason");
    expect(source).not.toContain("difficulty_border_color_alternates");
    expect(source).not.toContain("score_confidence");
  });

  it("buildResolvePrompt uses derived context fields", () => {
    expect(source).toContain("border_reason:");
    expect(source).toContain("derivedContexts");
    expect(source).not.toContain("difficulty_color_alternates");
  });
});
