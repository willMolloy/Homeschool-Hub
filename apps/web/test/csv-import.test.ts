import { describe, expect, it } from "vitest";
import { assignmentsCsvTemplate, errorText, parseAssignmentsCsv } from "../src/features/schedule/csvImport";
import { makeLookups } from "../src/features/schedule/lookups";
import { FRANK, LATIN, MAGGIE, MATH, OLD_KID, READING } from "./helpers/schedule-fixtures";

const lookups = makeLookups([FRANK, MAGGIE, OLD_KID], [MATH, READING, LATIN]);
const HEADER = "subject,title,children,unit,total,start,end";
const parse = (text: string) => parseAssignmentsCsv(text, lookups);

describe("parseAssignmentsCsv", () => {
  it("parses a valid file, with the columns in a different order and any case", () => {
    const r = parse("End,Total,Unit,Children,Title,Subject,Start\n2026-12-18,184,pages,Maggie,Charlotte's Web,Reading,2026-10-15\n");
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([{
      subjectId: READING.id, title: "Charlotte's Web", unitType: "pages", totalUnits: 184, weightPerUnit: null,
      startDate: "2026-10-15", endDate: "2026-12-18", childIds: [MAGGIE.id],
    }]);
  });

  it("handles quoted titles with commas, escaped quotes and line breaks, and the right line numbers after them", () => {
    const r = parse(`${HEADER}\nMath,"Saxon, 5/4 ""Intermediate""",Frank,lessons,20,2026-11-02,2026-11-26\nMath,"two\nlines",Frank,lessons,20,2026-11-02,2026-11-26\nMath,Late,Nobody,lessons,20,2026-11-02,2026-11-26`);
    expect(r.rows).toEqual([]);
    expect(r.errors).toEqual([{ line: 5, message: "no child named Nobody." }]);
    const ok = parse(`${HEADER}\nMath,"Saxon, 5/4 ""Intermediate""",Frank,lessons,20,2026-11-02,2026-11-26\nMath,"two\nlines",Frank,lessons,20,2026-11-02,2026-11-26`);
    expect(ok.rows.map((x) => x.title)).toEqual(['Saxon, 5/4 "Intermediate"', "two\nlines"]);
  });

  it("handles CRLF, a UTF-8 BOM and a trailing empty line", () => {
    const r = parse(`\uFEFF${HEADER}\r\nMath,Saxon,Frank,lessons,20,2026-11-02,2026-11-26\r\nReading,Novel,Maggie,pages,100,2026-11-02,2026-11-26\r\n\r\n`);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.title)).toEqual(["Saxon", "Novel"]);
  });

  it("accepts M/D/YYYY dates", () => {
    const r = parse(`${HEADER}\nMath,Saxon,Frank,lesson,20,11/2/2026,12/18/2026`);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ startDate: "2026-11-02", endDate: "2026-12-18", unitType: "lessons" });
  });

  it("takes several children split by ;, ignoring case and spaces, once each", () => {
    const r = parse(`${HEADER}\n  math ,Saxon," frank ; MAGGIE;Frank",lessons,20,2026-11-02,2026-11-26`);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ subjectId: MATH.id, childIds: [FRANK.id, MAGGIE.id] });
  });

  it("skips blank lines and rows of only commas", () => {
    const r = parse(`${HEADER}\n\nMath,Saxon,Frank,lessons,20,2026-11-02,2026-11-26\n,,,,,,\n   \n`);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });

  it("a missing header column is one error on line 1", () => {
    const r = parse("subject,title,children,unit,total,start\nMath,Saxon,Frank,lessons,20,2026-11-02");
    expect(r).toEqual({ rows: [], errors: [{ line: 1, message: "the header is missing the column end." }] });
    expect(parse("").errors[0]!.line).toBe(1);
  });

  it.each([
    ["an unknown subject", "Mth,Saxon,Frank,lessons,20,2026-11-02,2026-11-26", "no subject named Mth."],
    ["an archived subject", "Latin,Primer,Frank,lessons,20,2026-11-02,2026-11-26", "no subject named Latin."],
    ["an unknown child", "Math,Saxon,Margret,lessons,20,2026-11-02,2026-11-26", "no child named Margret."],
    ["an archived child", "Math,Saxon,Old Kid,lessons,20,2026-11-02,2026-11-26", "no child named Old Kid."],
    ["no children", "Math,Saxon,,lessons,20,2026-11-02,2026-11-26", "children is required (names separated by ;)."],
    ["a bad unit", "Math,Saxon,Frank,verses,20,2026-11-02,2026-11-26", 'unit must be one of pages, chapters, lessons, minutes (got "verses").'],
    ["total 0", "Math,Saxon,Frank,lessons,0,2026-11-02,2026-11-26", "total must be more than 0 and at most 100,000."],
    ["total too big", "Math,Saxon,Frank,lessons,100001,2026-11-02,2026-11-26", "total must be more than 0 and at most 100,000."],
    ["total not a number", "Math,Saxon,Frank,lessons,lots,2026-11-02,2026-11-26", "total must be a number, like 300."],
    ["total in hex (S3b-06)", "Math,Saxon,Frank,lessons,0x10,2026-11-02,2026-11-26", "total must be a number, like 300."],
    ["total with an exponent (S3b-06)", "Math,Saxon,Frank,lessons,1e2,2026-11-02,2026-11-26", "total must be a number, like 300."],
    ["total with a thousands comma (S3b-06)", 'Math,Saxon,Frank,lessons,"1,000",2026-11-02,2026-11-26', "total must be a number, like 300."],
    ["total with 3 decimals", "Math,Saxon,Frank,lessons,1.234,2026-11-02,2026-11-26", "total can have at most 2 decimal places."],
    ["a missing total", "Math,Saxon,Frank,lessons,,2026-11-02,2026-11-26", "total is required."],
    ["end before start", "Math,Saxon,Frank,lessons,20,2026-11-26,2026-11-02", "end must be on or after start."],
    ["a range over the day limit", "Math,Saxon,Frank,lessons,20,2026-01-01,2029-01-01", "start to end is 1097 days; the most allowed is 1096."],
    ["a bad date", "Math,Saxon,Frank,lessons,20,2026-02-30,2026-11-02", 'start must be a real date like 2026-11-02 or 11/2/2026 (got "2026-02-30").'],
    ["a year out of range", "Math,Saxon,Frank,lessons,20,1999-12-31,2026-11-02", "start must be in 2000–2100."],
    ["a missing title", "Math,  ,Frank,lessons,20,2026-11-02,2026-11-26", "title is required."],
    ["a 121-character title", `Math,${"x".repeat(121)},Frank,lessons,20,2026-11-02,2026-11-26`, "title must be 120 characters or fewer."],
  ])("%s → one clear error with the file's line number", (_l, row, message) => {
    const r = parse(`${HEADER}\n\nMath,Fine,Frank,lessons,1,2026-11-02,2026-11-26\n${row}`);
    expect(r.rows).toEqual([]);
    expect(r.errors).toEqual([{ line: 4, message }]);
    expect(errorText(r.errors[0]!)).toBe(`Line 4: ${message}`);
  });

  it("a name shared by two active children or subjects is an error on each line that uses it (S3b-03)", () => {
    const twin = { ...FRANK, id: "twin-1", name: "sam " };
    const sam = { ...FRANK, id: "twin-2", name: "Sam" };
    const archivedFrank = { ...FRANK, id: "old-frank", archived: true };
    const subjectTwin = { ...MATH, id: "math-2", name: "MATH" };
    const l = makeLookups([FRANK, MAGGIE, sam, twin, archivedFrank], [MATH, READING, subjectTwin, { ...LATIN, name: "Reading", id: "old-reading" }]);
    const r = parseAssignmentsCsv(`${HEADER}\nReading,A,Sam,lessons,20,2026-11-02,2026-11-26\nReading,B,"Frank;sam ",lessons,20,2026-11-02,2026-11-26\nMath,C,Frank,lessons,20,2026-11-02,2026-11-26\nReading,D,Frank,lessons,20,2026-11-02,2026-11-26`, l);
    expect(r.rows).toEqual([]);
    expect(r.errors.map(errorText)).toEqual([
      "Line 2: two children are named Sam. Rename one under Kids first.",
      "Line 3: two children are named sam. Rename one under Kids first.",
      "Line 4: two subjects are named Math. Rename one under Subjects first.",
    ]);
  });

  it("an archived duplicate name does not count (S3b-03)", () => {
    const l = makeLookups([FRANK, { ...FRANK, id: "old-frank", archived: true }], [MATH, { ...MATH, id: "old-math", archived: true }]);
    const r = parseAssignmentsCsv(`${HEADER}\nMath,A,Frank,lessons,20,2026-11-02,2026-11-26`, l);
    expect(r.errors).toEqual([]);
    expect(r.rows[0]).toMatchObject({ subjectId: MATH.id, childIds: [FRANK.id] });
  });

  describe("a file in the wrong shape (S3b-04)", () => {
    const row = "Math,Saxon,Frank,lessons,20,2026-11-02,2026-11-26";
    it("a semicolon file gets one message about separators", () => {
      const r = parse(`${HEADER.replace(/,/g, ";")}\n${row.replace(/,/g, ";")}`);
      expect(r).toEqual({ rows: [], errors: [{ line: 0, message: "This file uses semicolons (or tabs) between columns. Save it as CSV with commas." }] });
      expect(errorText(r.errors[0]!)).toBe("This file uses semicolons (or tabs) between columns. Save it as CSV with commas.");
    });
    it("a tab file (a paste from Sheets) gets the same message", () => {
      const r = parse(`${HEADER.replace(/,/g, "\t")}\n${row.replace(/,/g, "\t")}`);
      expect(r.errors).toEqual([{ line: 0, message: "This file uses semicolons (or tabs) between columns. Save it as CSV with commas." }]);
    });
    it("an unterminated quote names the line it opened on and stops", () => {
      const r = parse(`${HEADER}\n${row}\nMath,"Never closed,Frank,lessons,20,2026-11-02,2026-11-26\n${row}`);
      expect(r).toEqual({ rows: [], errors: [{ line: 3, message: "a quote is never closed." }] });
      expect(errorText(r.errors[0]!)).toBe("Line 3: a quote is never closed.");
    });
    it("a header with no rows under it says so", () => {
      for (const text of [HEADER, `${HEADER}\n`, `${HEADER}\n\n,,,,,,\n`]) {
        expect(parse(text)).toEqual({ rows: [], errors: [{ line: 0, message: "No assignments found under the header." }] });
      }
    });
    it("an unquoted comma in a title reports too many columns for that row only", () => {
      const r = parse(`${HEADER}\n${row}\nMath,Saxon, 5/4,Frank,lessons,20,2026-11-02,2026-11-26\n${row}`);
      expect(r.rows).toEqual([]);
      expect(r.errors.map(errorText)).toEqual(["Line 3: too many columns. Put quotes around text that contains commas."]);
    });
    it("a trailing comma on every line is still fine", () => {
      expect(parse(`${HEADER},\n${row},\n`).errors).toEqual([]);
      expect(parse(`${HEADER}\n${row},\n`).errors).toEqual([]);
    });
  });

  it("a total of plain digits passes, with spaces around it (S3b-06)", () => {
    const r = parse(`${HEADER}\nMath,A,Frank,lessons,300,2026-11-02,2026-11-26\nMath,B,Frank,lessons," 12.5 ",2026-11-02,2026-11-26`);
    expect(r.errors).toEqual([]);
    expect(r.rows.map((x) => x.totalUnits)).toEqual([300, 12.5]);
  });

  it("lists every error in a row and in later rows, and imports nothing", () => {
    const r = parse(`${HEADER}\nNope,Saxon,Nobody,lessons,20,2026-11-02,2026-11-26\nMath,Fine,Frank,lessons,20,2026-11-02,2026-11-26\nMath,Bad,Frank,lessons,0,2026-11-02,2026-11-26`);
    expect(r.rows).toEqual([]);
    expect(r.errors.map(errorText)).toEqual(["Line 2: no subject named Nope.", "Line 2: no child named Nobody.", "Line 4: total must be more than 0 and at most 100,000."]);
  });

  it("10,000 rows give the row-cap error without reading them all (S3b-05)", () => {
    const row = (i: number) => `Math,Book ${i},Frank,lessons,20,2026-11-02,2026-11-26`;
    const many = Array.from({ length: 10_000 }, (_, i) => row(i)).join("\n");
    const capped = { rows: [], errors: [{ line: 0, message: "Import at most 50 assignments at a time." }] };
    expect(parse(`${HEADER}\n${many}`)).toEqual(capped);
    // Proof it stopped at row 51: an open quote far past it is never reached.
    const fifty1 = Array.from({ length: 51 }, (_, i) => row(i)).join("\n");
    expect(parse(`${HEADER}\n${fifty1}\nMath,"never closed`)).toEqual(capped);
  });

  it("50 rows are fine, 51 are one whole-file error", () => {
    const row = (i: number) => `Math,Book ${i},Frank,lessons,20,2026-11-02,2026-11-26`;
    const fifty = Array.from({ length: 50 }, (_, i) => row(i)).join("\n");
    expect(parse(`${HEADER}\n${fifty}`).rows).toHaveLength(50);
    const r = parse(`${HEADER}\n${fifty}\n${row(51)}`);
    expect(r).toEqual({ rows: [], errors: [{ line: 0, message: "Import at most 50 assignments at a time." }] });
    expect(errorText(r.errors[0]!)).toBe("Import at most 50 assignments at a time.");
  });
});

describe("assignmentsCsvTemplate", () => {
  it("has the header row and one example that imports as is", () => {
    const t = assignmentsCsvTemplate(lookups);
    expect(t.split("\n")[0]).toBe(HEADER);
    const r = parse(t);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });
});
