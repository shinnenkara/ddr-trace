import type { ConsistencyFieldStats, FixtureEvalResult } from "./score-vision";

function countPasses(
  results: FixtureEvalResult[],
  field: "score" | "border" | "title",
): string {
  let passes = 0;
  let total = 0;

  for (const result of results) {
    if (result.status !== "success") {
      continue;
    }
    for (const stage of result.stages) {
      total++;
      if (stage[field].pass) {
        passes++;
      }
    }
  }

  return `${passes}/${total}`;
}

function pad(value: string, width: number): string {
  return value.padEnd(width);
}

export function formatEvalReport(results: FixtureEvalResult[]): string {
  const lines: string[] = [];
  lines.push(
    [
      pad("Fixture", 22),
      pad("Stages", 8),
      pad("Score", 8),
      pad("Border", 8),
      pad("Title", 8),
      "Weighted",
    ].join(""),
  );

  for (const result of results) {
    if (result.status === "error") {
      lines.push(`${pad(result.file, 22)} ERROR: ${result.error ?? "unknown"}`);
      continue;
    }

    const stageLabel = result.stageCount.pass
      ? `${result.stageCount.actual}/${result.stageCount.expected}`
      : `${result.stageCount.actual}/${result.stageCount.expected}!`;

    const scorePasses = result.stages.filter((s) => s.score.pass).length;
    const borderPasses = result.stages.filter((s) => s.border.pass).length;
    const titlePasses = result.stages.filter((s) => s.title.pass).length;

    lines.push(
      [
        pad(result.file, 22),
        pad(stageLabel, 8),
        pad(`${scorePasses}/${result.stages.length}`, 8),
        pad(`${borderPasses}/${result.stages.length}`, 8),
        pad(`${titlePasses}/${result.stages.length}`, 8),
        result.weightedScore.toFixed(2),
      ].join(""),
    );

    for (const stage of result.stages) {
      if (!stage.title.pass && stage.title.bestCandidate) {
        lines.push(
          `  title s${stage.stage}: expected "${stage.title.expected}" got "${stage.title.bestCandidate}" (sim ${(stage.title.similarity ?? 0).toFixed(2)})`,
        );
      }
      if (!stage.score.pass) {
        lines.push(
          `  score s${stage.stage}: expected ${stage.score.expected} got ${stage.score.actual}`,
        );
      }
      if (!stage.border.pass) {
        lines.push(
          `  border s${stage.stage}: expected ${stage.border.expected} got ${stage.border.actual}`,
        );
      }
    }
  }

  lines.push("");
  lines.push(
    `Totals — score ${countPasses(results, "score")}, border ${countPasses(results, "border")}, title ${countPasses(results, "title")}`,
  );

  return lines.join("\n");
}

export function formatConsistencyReport(
  file: string,
  stats: ConsistencyFieldStats,
): string {
  return `Consistency (${stats.runs} runs, ${file}): score ${(stats.score * 100).toFixed(0)}%  border ${(stats.border * 100).toFixed(0)}%  title ${(stats.title * 100).toFixed(0)}%`;
}

export function formatSnapshotDiff(
  file: string,
  diffs: string[],
): string {
  if (diffs.length === 0) {
    return `${file}: snapshot matches`;
  }

  return [`${file}: snapshot diff`, ...diffs.map((line) => `  ${line}`)].join(
    "\n",
  );
}
