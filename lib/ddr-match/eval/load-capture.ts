import { readFileSync } from "node:fs";
import type { DdrCapture } from "../ai-results-schema";
import type { GoldenFixture } from "./fixtures";
import { getFixtureImagePath } from "./fixtures";

const MIME_BY_EXT: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function mimeForFile(fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

export function loadCaptureFromFixture(fixture: GoldenFixture): DdrCapture {
  const imagePath = getFixtureImagePath(fixture);
  const buffer = readFileSync(imagePath);
  const mime = mimeForFile(fixture.file);

  return {
    capture_base64: buffer.toString("base64"),
    name: fixture.file,
    mime,
    chart_type: fixture.chart_type,
    player_side: fixture.player_side,
    user_id: "vision-eval",
    played_at: new Date("2026-06-09T00:00:00.000Z"),
  };
}
