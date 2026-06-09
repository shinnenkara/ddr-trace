/**
 * Generate a SQL seed file for `songs` + `song_variants` from the two DDR CSV exports.
 *
 * Song-level rows are deduplicated by (title, artist). Each CSV row becomes a
 * song_variants row linked to its parent song.
 *
 * Run:    npx tsx lib/db/scripts/seed.ts
 * Apply:  npx wrangler d1 execute ddr-trace-db --local --file=lib/db/temp/seed.sql
 *         (swap --local for --remote to seed the remote D1)
 */
import { createReadStream, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { parseCsvLine, toColumnName } from "./csv-utils";

const DATA_DIR = path.join(__dirname, "../temp");
const OUT_FILE = path.join(__dirname, "../temp/seed.sql");
const ROWS_PER_INSERT = 500;

const FILES: { file: string; type: "single" | "double" }[] = [
  {
    file: "DanceDanceRevolution Chart Data Spreadsheet - Single.csv",
    type: "single",
  },
  {
    file: "DanceDanceRevolution Chart Data Spreadsheet - Double.csv",
    type: "double",
  },
];

type Kind = "text" | "integer";

const SONG_COLUMNS: { col: string; kind: Kind }[] = [
  { col: "folder", kind: "text" },
  { col: "title", kind: "text" },
  { col: "artist", kind: "text" },
  { col: "song_length", kind: "integer" },
  { col: "display_bpm_min", kind: "integer" },
  { col: "display_bpm_max", kind: "integer" },
  { col: "bpm_changes", kind: "integer" },
];

const VARIANT_COLUMNS: { col: string; kind: Kind }[] = [
  { col: "difficulty", kind: "text" },
  { col: "rating", kind: "integer" },
  { col: "notes", kind: "integer" },
  { col: "steps", kind: "integer" },
  { col: "jumps", kind: "integer" },
  { col: "holds", kind: "integer" },
  { col: "shock_arrows", kind: "integer" },
  { col: "max_combo_steps_shock_arrows", kind: "integer" },
];

const ALL_COLUMNS = [...SONG_COLUMNS, ...VARIANT_COLUMNS];

type ParsedRow = {
  type: "single" | "double";
  values: Record<string, string | null>;
};

function sqlText(v: string): string {
  return "'" + v.replace(/'/g, "''") + "'";
}

function sqlInt(v: string): string {
  const t = v.trim();
  if (t === "" || t === "N/A") return "NULL";
  const n = Number(t);
  return Number.isFinite(n) ? String(Math.round(n)) : "NULL";
}

function songKey(title: string, artist: string): string {
  return `${title}\0${artist}`;
}

/** Read all valid CSV rows from both files. */
async function readAllRows(): Promise<ParsedRow[]> {
  const rows: ParsedRow[] = [];

  for (const { file, type } of FILES) {
    const rl = createInterface({
      input: createReadStream(path.join(DATA_DIR, file)),
      crlfDelay: Infinity,
    });

    const colIndex: Record<string, number> = {};
    let isHeader = true;

    for await (const line of rl) {
      const cells = parseCsvLine(line);
      if (isHeader) {
        cells.forEach((h, i) => (colIndex[toColumnName(h)] = i));
        const missing = ALL_COLUMNS.filter((c) => !(c.col in colIndex)).map(
          (c) => c.col,
        );
        if (missing.length) {
          throw new Error(
            `${file}: missing expected columns: ${missing.join(", ")}`,
          );
        }
        isHeader = false;
        continue;
      }
      if (cells.length <= 1 && (cells[0] ?? "").trim() === "") continue;

      const values: Record<string, string | null> = {};
      let hasNull = false;
      for (const c of ALL_COLUMNS) {
        const raw = cells[colIndex[c.col]] ?? "";
        const v = c.kind === "integer" ? sqlInt(raw) : sqlText(raw);
        if (v === "NULL") hasNull = true;
        values[c.col] = v;
      }
      if (hasNull) continue;

      rows.push({ type, values });
    }
    rl.close();
  }

  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const parsedRows = await readAllRows();

  const songIdByKey = new Map<string, number>();
  const songTuples: string[] = [];
  const variantTuples: string[] = [];
  let nextSongId = 1;
  let skippedConflicts = 0;

  const songMetaByKey = new Map<
    string,
    Record<string, string | null>
  >();

  for (const row of parsedRows) {
    const title = row.values.title!;
    const artist = row.values.artist!;
    const key = songKey(title, artist);

    const songMeta: Record<string, string | null> = {};
    for (const c of SONG_COLUMNS) {
      songMeta[c.col] = row.values[c.col] ?? null;
    }

    const existing = songMetaByKey.get(key);
    if (existing) {
      let hasConflict = false;
      for (const c of SONG_COLUMNS) {
        if (existing[c.col] !== songMeta[c.col]) {
          skippedConflicts++;
          console.warn(
            `Conflict for "${title}" / "${artist}": ${c.col} differs (${existing[c.col]} vs ${songMeta[c.col]}), skipping variant`,
          );
          hasConflict = true;
          break;
        }
      }
      if (hasConflict) continue;
    } else {
      songMetaByKey.set(key, songMeta);
      songIdByKey.set(key, nextSongId);
      const songValues = SONG_COLUMNS.map((c) => songMeta[c.col]);
      songTuples.push(`(${nextSongId},${songValues.join(",")})`);
      nextSongId++;
    }

    const songId = songIdByKey.get(key);
    if (!songId) continue;

    const variantValues = [
      songId,
      sqlText(row.type),
      ...VARIANT_COLUMNS.map((c) => row.values[c.col]),
    ];
    variantTuples.push(`(${variantValues.join(",")})`);
  }

  const songColumnList = SONG_COLUMNS.map((c) => c.col).join(", ");
  const variantColumnList = [
    "song_id",
    "type",
    ...VARIANT_COLUMNS.map((c) => c.col),
  ].join(", ");

  const out: string[] = [
    "-- Auto-generated by lib/db/scripts/seed.ts. Do not edit by hand.",
    "PRAGMA foreign_keys=OFF;",
    "DELETE FROM song_variants;",
    "DELETE FROM songs;",
    "",
    `-- songs: ${songTuples.length} rows`,
  ];

  for (const batch of chunk(songTuples, ROWS_PER_INSERT)) {
    out.push(`INSERT INTO songs (id, ${songColumnList}) VALUES`);
    out.push(batch.join(",\n") + ";");
  }

  out.push("");
  out.push(`-- song_variants: ${variantTuples.length} rows`);
  for (const batch of chunk(variantTuples, ROWS_PER_INSERT)) {
    out.push(`INSERT INTO song_variants (${variantColumnList}) VALUES`);
    out.push(batch.join(",\n") + ";");
  }

  writeFileSync(OUT_FILE, out.join("\n"));
  console.log(
    `Wrote ${songTuples.length} songs and ${variantTuples.length} variants to ${path.relative(process.cwd(), OUT_FILE)} (${skippedConflicts} metadata conflicts skipped)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
