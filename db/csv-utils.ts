/**
 * Shared helpers for parsing the DDR chart-temp CSVs and for deriving DB column
 * names from CSV headers. Used by both db/parse-headers.ts (schema generation)
 * and db/seed.ts (temp import) so the header -> column mapping stays identical.
 */

/**
 * Normalize a CSV header into the snake_case name used for BOTH the Drizzle JS
 * key and the DB column name: lowercase, brackets removed, any other symbol
 * becomes an underscore, then trimmed. Names starting with a digit are prefixed
 * with "n" so they are valid JS identifiers.
 */
export function toColumnName(header: string): string {
    let k = header
        .toLowerCase()
        .replace(/[()\[\]{}]/g, "") // ignore brackets
        .replace(/[^a-z0-9]+/g, "_") // any other symbol -> underscore
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, ""); // trim
    if (/^[0-9]/.test(k)) k = "n" + k; // identifiers can't start with a digit
    return k;
}

/** Parse a single CSV line, respecting double-quoted fields. */
export function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQuotes) {
            if (c === '"') {
                if (line[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ",") {
            out.push(field);
            field = "";
        } else {
            field += c;
        }
    }
    out.push(field);
    return out;
}
