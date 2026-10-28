/**
 * The SQL CHECK lists repeat the engine's enum constants (RF-08). This fails if
 * either side gains or loses a value without the other.
 */
import { BLOCKED_KINDS, LEARNED_UNIT_TYPES, OVERRIDE_MODES, SUBJECT_RULES, UNIT_TYPES, WEEK_REVIEW_STATUSES, WEEK_STARTS } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate, MIGRATIONS_DIR } from "../migrate";
import { createScratch, dropScratch, hasDb, q } from "./scratch";

const DB = "hh_enums_test";

const CHECKED: [table: string, column: string, values: readonly string[]][] = [
  ["family", "week_start", WEEK_STARTS],
  ["assignment", "unit_type", UNIT_TYPES],
  ["event", "default_rule", SUBJECT_RULES],
  ["event_subject_rule", "rule", SUBJECT_RULES],
  ["week_override", "mode", OVERRIDE_MODES],
  ["blocked_range", "kind", BLOCKED_KINDS],
  ["weight_choice", "unit_type", LEARNED_UNIT_TYPES],
  ["subject", "default_weight_unit", UNIT_TYPES],
  ["progress_checkin", "mode", OVERRIDE_MODES],
  ["week_review", "status", WEEK_REVIEW_STATUSES],
];

/** The quoted literals in a CHECK definition, e.g. CHECK ((x = ANY (ARRAY['a'::text, 'b'::text]))). */
function checkValues(def: string): string[] {
  return [...def.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]!.replace(/''/g, "'"));
}

describe("checkValues", () => {
  it("reads Postgres' rendering of IN (...)", () => {
    expect(checkValues("CHECK ((unit_type = ANY (ARRAY['pages'::text, 'it''s'::text])))")).toEqual(["pages", "it's"]);
  });
});

describe.skipIf(!hasDb)("CHECK constraints match the engine constants (integration)", () => {
  let url = "";
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, MIGRATIONS_DIR, () => {});
  });
  afterAll(() => dropScratch(DB));

  it.each(CHECKED)("%s.%s", async (table, column, values) => {
    const rows = await q<{ def: string }>(url, `
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
      WHERE c.contype = 'c' AND c.conrelid = $1::regclass AND a.attname = $2 AND cardinality(c.conkey) = 1`, [table, column]);
    expect(rows).toHaveLength(1);
    expect(new Set(checkValues(rows[0]!.def))).toEqual(new Set(values));
  });
});
