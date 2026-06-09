import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DdrVisionParseResult } from "../ai-results-schema";
import type { GoldenFixture } from "./fixtures";

const snapshotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "snapshots",
);

function snapshotPath(fixture: GoldenFixture): string {
  const baseName = fixture.file.replace(/\.[^.]+$/, "");
  return join(snapshotsDir, `${baseName}.json`);
}

export function ensureSnapshotsDir(): void {
  if (!existsSync(snapshotsDir)) {
    mkdirSync(snapshotsDir, { recursive: true });
  }
}

export function saveSnapshot(
  fixture: GoldenFixture,
  vision: DdrVisionParseResult,
): void {
  ensureSnapshotsDir();
  writeFileSync(snapshotPath(fixture), JSON.stringify(vision, null, 2));
}

export function loadSnapshot(
  fixture: GoldenFixture,
): DdrVisionParseResult | null {
  const path = snapshotPath(fixture);
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8")) as DdrVisionParseResult;
}

function summarizeVision(vision: DdrVisionParseResult): string[] {
  if (vision.status !== "success") {
    return [`status=error error=${vision.error}`];
  }

  return vision.stages.flatMap((stage) => {
    const p1Score = stage.p1?.score ?? "null";
    const p2Score = stage.p2?.score ?? "null";
    const p1Border = stage.p1?.difficulty_border[0]?.color ?? "none";
    const p2Border = stage.p2?.difficulty_border[0]?.color ?? "none";
    const topTitle = stage.title_candidates[0]?.title ?? "none";

    return [
      `stage ${stage.stage}: title="${topTitle}" p1=${p1Score}/${p1Border} p2=${p2Score}/${p2Border}`,
    ];
  });
}

export function diffVisionSnapshots(
  baseline: DdrVisionParseResult,
  current: DdrVisionParseResult,
): string[] {
  const baselineLines = summarizeVision(baseline);
  const currentLines = summarizeVision(current);
  const diffs: string[] = [];

  const max = Math.max(baselineLines.length, currentLines.length);
  for (let index = 0; index < max; index++) {
    const before = baselineLines[index] ?? "(missing)";
    const after = currentLines[index] ?? "(missing)";
    if (before !== after) {
      diffs.push(`- ${before}`);
      diffs.push(`+ ${after}`);
    }
  }

  if (baseline.status !== current.status) {
    diffs.unshift(`status: ${baseline.status} -> ${current.status}`);
  }

  return diffs;
}
