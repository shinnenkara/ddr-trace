import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "column-contains.ts"),
  "utf8",
);

describe("columnContains", () => {
  it("uses instr for substring search to avoid SQLite LIKE complexity limits", () => {
    expect(source).toContain("instr(");
    expect(source).not.toContain("like(");
  });
});
