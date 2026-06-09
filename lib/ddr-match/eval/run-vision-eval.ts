import { writeFileSync } from "node:fs";
import * as dotenv from "dotenv";
import { parseResultsScreenVision } from "../get-ai-ddr-results";
import { filterFixtures, loadGoldenFixtures } from "./fixtures";
import {
  formatConsistencyReport,
  formatEvalReport,
  formatSnapshotDiff,
} from "./format-report";
import { getEvalApiKey } from "./eval-models";
import { loadCaptureFromFixture } from "./load-capture";
import { createEmbeddingTitleMatcher } from "./match-title";
import {
  diffVisionSnapshots,
  loadSnapshot,
  saveSnapshot,
} from "./snapshot-utils";
import {
  scoreVisionAgainstGolden,
  summarizeConsistency,
  type FixtureEvalResult,
} from "./score-vision";

dotenv.config({ path: ".dev.vars" });

type CliOptions = {
  fixture?: string;
  runs: number;
  minScore: number;
  jsonOut?: string;
  updateSnapshots: boolean;
  diffSnapshots: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    runs: 1,
    minScore: 0.8,
    updateSnapshots: false,
    diffSnapshots: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--fixture") {
      options.fixture = argv[++index];
    } else if (arg === "--runs") {
      options.runs = Number(argv[++index]);
    } else if (arg === "--min-score") {
      options.minScore = Number(argv[++index]);
    } else if (arg === "--json") {
      options.jsonOut = argv[++index];
    } else if (arg === "--update-snapshots") {
      options.updateSnapshots = true;
    } else if (arg === "--diff-snapshots") {
      options.diffSnapshots = true;
    }
  }

  return options;
}

async function evaluateFixture(
  fixture: (ReturnType<typeof loadGoldenFixtures>)[number],
  apiKey: string,
): Promise<{ vision: Awaited<ReturnType<typeof parseResultsScreenVision>>; result: FixtureEvalResult }> {
  const capture = loadCaptureFromFixture(fixture);
  const vision = await parseResultsScreenVision(capture, {
    apiKey,
    temperature: 0,
    seed: 0,
  });
  const matchTitle = createEmbeddingTitleMatcher(apiKey);
  const result = await scoreVisionAgainstGolden(fixture, vision, matchTitle);

  return { vision, result };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = getEvalApiKey();
  const fixtures = filterFixtures(loadGoldenFixtures(), options.fixture);

  if (fixtures.length === 0) {
    console.error("No fixtures matched.");
    process.exit(1);
  }

  const allResults: FixtureEvalResult[] = [];
  const consistencyLines: string[] = [];
  const snapshotLines: string[] = [];

  for (const fixture of fixtures) {
    const runResults: FixtureEvalResult[] = [];

    for (let run = 0; run < options.runs; run++) {
      const { vision, result } = await evaluateFixture(fixture, apiKey);
      runResults.push(result);

      if (options.updateSnapshots) {
        saveSnapshot(fixture, vision);
      }

      if (options.diffSnapshots) {
        const baseline = loadSnapshot(fixture);
        if (!baseline) {
          snapshotLines.push(`${fixture.file}: no snapshot (run with --update-snapshots first)`);
        } else {
          snapshotLines.push(
            formatSnapshotDiff(fixture.file, diffVisionSnapshots(baseline, vision)),
          );
        }
      }
    }

    allResults.push(runResults[runResults.length - 1]!);

    if (options.runs > 1) {
      consistencyLines.push(
        formatConsistencyReport(fixture.file, summarizeConsistency(runResults)),
      );
    }
  }

  console.log(formatEvalReport(allResults));

  for (const line of consistencyLines) {
    console.log(line);
  }

  for (const line of snapshotLines) {
    console.log(line);
  }

  if (options.jsonOut) {
    writeFileSync(options.jsonOut, JSON.stringify(allResults, null, 2));
  }

  const failed = allResults.some(
    (result) =>
      result.status === "error" ||
      !result.stageCount.pass ||
      result.weightedScore < options.minScore,
  );

  if (failed) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
