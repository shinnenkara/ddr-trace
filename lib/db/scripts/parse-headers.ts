/**
 * Inspect the DDR chart-temp CSV files: parse + compare headers across the
 * Single and Double spreadsheets, and infer a basic type for each column from
 * a sample of rows.
 *
 * Run with:  npx tsx db/parse-headers.ts
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { parseCsvLine, toColumnName } from "./csv-utils";

const DATA_DIR = path.join(__dirname, "../temp");
const FILES = {
  single: "DanceDanceRevolution Chart Data Spreadsheet - Single.csv",
  double: "DanceDanceRevolution Chart Data Spreadsheet - Double.csv",
} as const;

const SAMPLE_ROWS = 2000;

/**
 * Only emit these CSV columns in the generated schema (original header names).
 * Leave empty to emit the full union of all columns.
 */
const FOCUS_COLUMNS = new Set<string>([
  "Folder",
  "Title",
  "Difficulty",
  "Rating",
  "Song Length",
  "Display BPM (min)",
  "Display BPM (max)",
  "BPM Changes",
  "Artist",
  "Notes",
  "Steps",
  "Jumps",
  "Holds",
  "Shock Arrows",
  "Max Combo (Steps+Shock Arrows)",
]);

type InferredType = "integer" | "real" | "percent" | "text" | "empty";

/** Read the header row + up to `sampleRows` temp rows from a CSV file. */
async function readCsv(file: string, sampleRows: number) {
  const rl = createInterface({
    input: createReadStream(path.join(DATA_DIR, file)),
    crlfDelay: Infinity,
  });
  let header: string[] = [];
  const rows: string[][] = [];
  let i = 0;
  for await (const line of rl) {
    if (i === 0) {
      header = parseCsvLine(line);
    } else if (i <= sampleRows) {
      rows.push(parseCsvLine(line));
    } else {
      break;
    }
    i++;
  }
  rl.close();
  return { header, rows };
}

function classifyValue(v: string): InferredType {
  const t = v.trim();
  if (t === "" || t === "N/A") return "empty";
  if (/%$/.test(t)) return "percent";
  if (/^-?\d+$/.test(t)) return "integer";
  if (/^-?\d*\.\d+$/.test(t)) return "real";
  return "text";
}

/** Reduce a set of per-cell classifications into one column type. */
function reduceTypes(types: InferredType[]): InferredType {
  const present = new Set(types.filter((t) => t !== "empty"));
  if (present.size === 0) return "empty";
  if (present.has("text")) return "text";
  if (present.has("percent")) return "percent";
  if (present.has("real")) return "real";
  if (present.has("integer")) return "integer";
  return "text";
}

function inferColumnTypes(header: string[], rows: string[][]) {
  return header.map((name, col) => {
    const types = rows.map((r) => classifyValue(r[col] ?? ""));
    const nonEmpty = types.filter((t) => t !== "empty").length;
    return {
      name,
      type: reduceTypes(types),
      nullable: nonEmpty < rows.length,
      sample: rows.find((r) => (r[col] ?? "").trim() !== "")?.[col] ?? "",
    };
  });
}

type Column = {
  name: string; // original CSV header
  type: InferredType;
  nullable: boolean;
  scope: "common" | "single" | "double";
};

/** Map an inferred type to a Drizzle column builder. percent is kept as raw text. */
function drizzleBuilder(type: InferredType): string {
  switch (type) {
    case "integer":
      return "integer";
    case "real":
      return "real";
    default:
      return "text"; // text, percent, empty
  }
}

function generateSchema(columns: Column[]): string {
  const used = new Set<string>(["id", "type"]);
  const lines: string[] = [];
  for (const c of columns) {
    let key = toColumnName(c.name);
    while (used.has(key)) key += "_x";
    used.add(key);
    const builder = drizzleBuilder(c.type);
    const notNull = c.nullable ? "" : ".notNull()";
    // Normalized name is used for both the JS key and the DB column name;
    // the original CSV header is preserved as a trailing comment.
    lines.push(
      `    ${key}: ${builder}(${JSON.stringify(key)})${notNull}, // ${c.name}`,
    );
  }
  return [
    "import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';",
    "",
    "export const charts = sqliteTable('charts', {",
    "    id: integer('id').primaryKey({ autoIncrement: true }),",
    "    type: text('type', { enum: ['single', 'double'] }).notNull(),",
    ...lines,
    "});",
    "",
    "export type Chart = typeof charts.$inferSelect;",
    "export type InsertChart = typeof charts.$inferInsert;",
  ].join("\n");
}

async function main() {
  const single = await readCsv(FILES.single, SAMPLE_ROWS);
  const double = await readCsv(FILES.double, SAMPLE_ROWS);

  const singleSet = new Set(single.header);
  const doubleSet = new Set(double.header);

  const common = single.header.filter((h) => doubleSet.has(h));
  const singleOnly = single.header.filter((h) => !doubleSet.has(h));
  const doubleOnly = double.header.filter((h) => !singleSet.has(h));

  console.log("=".repeat(70));
  console.log("HEADER COMPARISON");
  console.log("=".repeat(70));
  console.log(`Single columns : ${single.header.length}`);
  console.log(`Double columns : ${double.header.length}`);
  console.log(`Common columns : ${common.length}`);
  console.log(`Single-only    : ${singleOnly.length}`);
  console.log(`Double-only    : ${doubleOnly.length}`);

  console.log("\n--- SINGLE-ONLY COLUMNS ---");
  singleOnly.forEach((h) => console.log(`  - ${h}`));

  console.log("\n--- DOUBLE-ONLY COLUMNS ---");
  doubleOnly.forEach((h) => console.log(`  - ${h}`));

  const singleTypes = inferColumnTypes(single.header, single.rows);
  const doubleTypes = inferColumnTypes(double.header, double.rows);
  const doubleTypeByName = new Map(doubleTypes.map((c) => [c.name, c]));

  console.log("\n" + "=".repeat(70));
  console.log(`INFERRED COLUMN TYPES (sampled ${SAMPLE_ROWS} rows)`);
  console.log("=".repeat(70));
  console.log("scope   | type     | null | column / sample");
  console.log("-".repeat(70));

  const fmt = (
    scope: string,
    c: { name: string; type: string; nullable: boolean; sample: string },
  ) =>
    `${scope.padEnd(7)} | ${c.type.padEnd(8)} | ${(c.nullable ? "Y" : "n").padEnd(4)} | ${c.name}  ::  ${c.sample}`;

  for (const c of singleTypes) {
    const scope = doubleSet.has(c.name) ? "common" : "single";
    // For common columns, widen the type if double disagrees.
    if (scope === "common") {
      const d = doubleTypeByName.get(c.name)!;
      const merged = reduceTypes([
        c.type as InferredType,
        d.type as InferredType,
      ]);
      console.log(
        fmt(scope, { ...c, type: merged, nullable: c.nullable || d.nullable }),
      );
    } else {
      console.log(fmt(scope, c));
    }
  }
  for (const c of doubleTypes) {
    if (!singleSet.has(c.name)) console.log(fmt("double", c));
  }

  // Build the combined (union) column list: single's columns in order,
  // then double-only columns appended. Columns missing from either file are
  // nullable; common columns widen their type if the two files disagree.
  const columns: Column[] = [];
  for (const c of singleTypes) {
    if (doubleSet.has(c.name)) {
      const d = doubleTypeByName.get(c.name)!;
      columns.push({
        name: c.name,
        type: reduceTypes([c.type, d.type]),
        nullable: c.nullable || d.nullable,
        scope: "common",
      });
    } else {
      columns.push({
        name: c.name,
        type: c.type,
        nullable: true,
        scope: "single",
      });
    }
  }
  for (const c of doubleTypes) {
    if (!singleSet.has(c.name)) {
      columns.push({
        name: c.name,
        type: c.type,
        nullable: true,
        scope: "double",
      });
    }
  }

  const focused =
    FOCUS_COLUMNS.size === 0
      ? columns
      : columns.filter((c) => FOCUS_COLUMNS.has(c.name));

  console.log("\n" + "=".repeat(70));
  console.log("DRIZZLE SCHEMA (copy/paste into db/schema.ts)");
  console.log("=".repeat(70));
  console.log(generateSchema(focused));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
