/**
 * S17-03: scripts/e2e/seed-cm-family.ts builds the Charlotte Mason family on a fresh `_dev` database, and refuses any database whose
 * name does not end in `_dev` (and production) before it touches anything.
 */
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDevDatabase, banner, LOGINS, seedCmFamily, type CmSummary } from "../../scripts/e2e/seed-cm-family";
import { hasDb, urlFor } from "./scratch";

const SCRATCH = "hh_e2e_seed_scratch_dev";

/** One short-lived client on a database of the same server as the test database. */
async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: url });
  c.on("error", () => {});
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end().catch(() => {});
  }
}

describe("the guard", () => {
  it("accepts a name ending in _dev and nothing else", () => {
    expect(() => assertDevDatabase("postgres://u:p@localhost:5432/hh_dev")).not.toThrow();
    expect(() => assertDevDatabase("postgres://u:p@localhost:5432/hh_e2e_dev")).not.toThrow();
    for (const bad of ["hh_test", "hh", "hh_dev_backup", "hh_prod", "devdb", "hh_dev2", "postgres"]) {
      expect(() => assertDevDatabase(`postgres://u:p@localhost:5432/${bad}`), bad).toThrow(/refusing to seed database .* ending in _dev/);
    }
  });
  it("refuses production even for a _dev name", () => {
    expect(() => assertDevDatabase("postgres://u:p@localhost:5432/hh_dev", { NODE_ENV: "production" })).toThrow(/production/);
  });
  it("prints local logins only: example.com addresses and throwaway passwords, nothing from the environment", () => {
    expect(LOGINS.length).toBeGreaterThanOrEqual(4);
    for (const l of LOGINS) {
      expect(l.email).toMatch(/^cm-[a-z]+@example\.com$/);
      expect(l.password).toMatch(/^cm-run-[a-z]+-\d$/);
    }
    const summary = { databaseName: "x_dev", hartleyFamilyId: "a", coopFamilyId: "b", counts: { children: 3, subjects: 11, assignments: 30, breaks: 5, events: 2, logEntries: 21, viewers: 1, parents: 2 }, logins: LOGINS } satisfies CmSummary;
    const text = banner(summary);
    for (const l of LOGINS) expect(text).toContain(`${l.email}  /  ${l.password}`);
    expect(text).not.toMatch(/SESSION_SECRET|postgres:\/\//);
  });
});

describe.skipIf(!hasDb)("the seed (integration, on its own scratch _dev database)", () => {
  let url = "";
  let first: CmSummary;
  const q = <T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) => withClient(url, (c) => c.query<T>(sql, params)).then((r) => r.rows);

  beforeAll(async () => {
    await withClient(urlFor("postgres"), async (c) => {
      await c.query(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
      await c.query(`CREATE DATABASE ${SCRATCH}`);
    }).catch(async () => {
      // the test role may not be allowed on the postgres database: use the test database's own connection
      await withClient(process.env.DATABASE_URL!, async (c) => {
        await c.query(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
        await c.query(`CREATE DATABASE ${SCRATCH}`);
      });
    });
    url = urlFor(SCRATCH);
    first = await seedCmFamily(url, { reset: true });
  }, 120_000);
  afterAll(async () => {
    await withClient(process.env.DATABASE_URL!, (c) => c.query(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`));
  });

  it("refuses a database not ending in _dev before touching it (the test database keeps its data)", async () => {
    const before = await withClient(process.env.DATABASE_URL!, (c) => c.query("SELECT count(*)::int AS n FROM parent"));
    await expect(seedCmFamily(process.env.DATABASE_URL!, { reset: true })).rejects.toThrow(/ending in _dev/);
    await expect(seedCmFamily(urlFor("hh_nope_test"))).rejects.toThrow(/ending in _dev/);
    const after = await withClient(process.env.DATABASE_URL!, (c) => c.query("SELECT count(*)::int AS n FROM parent"));
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
    const cm = await withClient(process.env.DATABASE_URL!, (c) => c.query("SELECT count(*)::int AS n FROM parent WHERE email LIKE 'cm-%@example.com'"));
    expect(cm.rows[0]!.n).toBe(0);
  });

  it("builds the Hartley family: three children, a co-op account, a second parent and the viewers", async () => {
    expect(first.counts).toMatchObject({ children: 3, subjects: 11, parents: 2, viewers: 1, breaks: 5, events: 2 });
    const kids = await q<{ name: string }>("SELECT name FROM child WHERE family_id = $1 ORDER BY sort_order", [first.hartleyFamilyId]);
    expect(kids.map((k) => k.name)).toEqual(["Elias", "Clara", "Wren"]);
    const members = await q<{ email: string; role: string; family: string }>(
      `SELECT p.email, m.role, f.name AS family FROM family_member m JOIN parent p ON p.id = m.parent_id JOIN family f ON f.id = m.family_id WHERE p.email LIKE 'cm-%' ORDER BY p.email, f.name`);
    expect(members).toEqual([
      { email: "cm-coop@example.com", role: "parent", family: "Hearth Co-op" },
      { email: "cm-grandma@example.com", role: "viewer", family: "Hartley family" },
      { email: "cm-rachel@example.com", role: "parent", family: "Hartley family" },
      { email: "cm-rachel@example.com", role: "viewer", family: "Hearth Co-op" },
      { email: "cm-tom@example.com", role: "parent", family: "Hartley family" },
      { email: "cm-tom@example.com", role: "viewer", family: "Hearth Co-op" },
    ]);
  });

  it("has Fall and Spring, Thanksgiving week and a Christmas break, and Friday co-op in both terms", async () => {
    const fam = await q<{ school_year_start: string; school_year_end: string; school_year_shape: string; setup_done: boolean }>("SELECT school_year_start::text, school_year_end::text, school_year_shape, setup_done FROM family WHERE id = $1", [first.hartleyFamilyId]);
    expect(fam[0]).toEqual({ school_year_start: "2026-08-17", school_year_end: "2027-05-21", school_year_shape: "fall-spring", setup_done: true });
    const br = await q<{ label: string; start_date: string; end_date: string }>("SELECT label, start_date::text, end_date::text FROM blocked_range WHERE family_id = $1 ORDER BY start_date", [first.hartleyFamilyId]);
    expect(br.map((b) => b.label)).toEqual(expect.arrayContaining(["Thanksgiving week", "Christmas break"]));
    expect(br.find((b) => b.label === "Thanksgiving week")).toMatchObject({ start_date: "2026-11-23", end_date: "2026-11-27" });
    const ev = await q<{ name: string; weekdays: number[] }>("SELECT name, weekdays FROM event WHERE family_id = $1 ORDER BY start_date", [first.hartleyFamilyId]);
    expect(ev.map((e) => e.weekdays)).toEqual([[5], [5]]);
    const terms = await q<{ first: string; last: string }>("SELECT min(start_date)::text AS first, max(end_date)::text AS last FROM assignment WHERE family_id = $1", [first.hartleyFamilyId]);
    expect(terms[0]!.first).toBe("2026-08-17");
    expect(terms[0]!.last >= "2027-05-21").toBe(true);
  });

  it("has about 30 assignments in Charlotte Mason style, Wren on Tuesday to Friday, and the study subjects once a week", async () => {
    expect(first.counts.assignments).toBeGreaterThanOrEqual(28);
    expect(first.counts.assignments).toBeLessThanOrEqual(34);
    const rows = await q<{ title: string; unit_type: string; weekdays: number[] | null; kids: string[]; subject: string }>(
      `SELECT a.title, a.unit_type, a.weekdays, s.name AS subject, array_agg(c.name ORDER BY c.sort_order) AS kids
         FROM assignment a JOIN subject s ON s.id = a.subject_id JOIN assignment_child ac ON ac.assignment_id = a.id JOIN child c ON c.id = ac.child_id
        WHERE a.family_id = $1 GROUP BY a.id, s.name`, [first.hartleyFamilyId]);
    const types = new Set(rows.map((r) => r.unit_type));
    expect([...types].sort()).toEqual(["chapters", "lessons", "minutes", "pages"]);
    // S18-04 (E11): the days belong to an assignment, so every assignment Wren has, her own or shared, runs only on her Tuesday to Friday.
    for (const r of rows.filter((x) => x.kids.includes("Wren"))) expect(r.weekdays, r.title).toSatisfy((d: number[] | null) => d !== null && d.length > 0 && d.every((x) => [2, 3, 4, 5].includes(x)));
    expect(rows.filter((x) => x.kids.length === 1 && x.kids[0] === "Wren" && x.subject === "Math").every((x) => x.weekdays?.join() === "2,3,4,5")).toBe(true);
    for (const subject of ["Picture study", "Composer study"]) for (const r of rows.filter((x) => x.subject === subject)) expect(r.weekdays, r.title).toHaveLength(1);
    expect(rows.filter((r) => r.unit_type === "minutes").map((r) => r.subject)).toEqual(expect.arrayContaining(["Nature study"]));
    expect(rows.some((r) => r.kids.length === 3)).toBe(true); // shared work, "Together"
    expect(rows.some((r) => r.subject === "Copywork") && rows.some((r) => r.subject === "Recitation")).toBe(true);
  });

  it("has one finished early, one stopped, one running late, and some waiting for an answer", async () => {
    const ended = await q<{ title: string; ended_as: string; ended_on: string; end_date: string }>("SELECT title, ended_as, ended_on::text, end_date::text FROM assignment WHERE family_id = $1 AND ended_as IS NOT NULL ORDER BY title", [first.hartleyFamilyId]);
    expect(ended.filter((e) => e.ended_as === "finished").every((e) => e.ended_on < e.end_date)).toBe(true);
    expect(ended.filter((e) => e.ended_as === "finished").length).toBeGreaterThanOrEqual(2);
    expect(ended.filter((e) => e.ended_as === "stopped")).toHaveLength(1);
    const late = await q<{ title: string; n: number }>("SELECT a.title, count(*)::int AS n FROM progress_checkin p JOIN assignment a ON a.id = p.assignment_id WHERE a.family_id = $1 GROUP BY a.title", [first.hartleyFamilyId]);
    expect(late).toEqual([{ title: "A Child's History of the World", n: 2 }]);
    const waiting = await q<{ title: string }>("SELECT title FROM assignment WHERE family_id = $1 AND ended_as IS NULL AND end_date < '2026-11-05' AND archived_at IS NULL ORDER BY title", [first.hartleyFamilyId]);
    expect(waiting.map((w) => w.title)).toEqual(["Geography: Africa", "Winnie-the-Pooh"]);
  });

  it("has six weeks of typed log entries: hours by subject, notes, books, school days, a run of days with a Saturday catch-up", async () => {
    const rows = await q<{ start_date: string; end_date: string; days: string[] | null; counts_school_day: boolean; school_days: number; notes: string | null; books: string[]; subject_minutes: Record<string, number> }>(
      "SELECT start_date::text, end_date::text, days::text[], counts_school_day, school_days, notes, books, subject_minutes FROM record_entry WHERE family_id = $1 ORDER BY start_date", [first.hartleyFamilyId]);
    expect(rows).toHaveLength(first.counts.logEntries);
    const mondays = new Set(rows.map((r) => r.start_date.slice(0, 7)));
    expect(rows[0]!.start_date <= "2026-09-22").toBe(true);
    expect(rows.at(-1)!.end_date <= "2026-11-01").toBe(true);
    const weeks = new Set(rows.map((r) => Math.floor((Date.parse(r.start_date) - Date.parse("2026-09-21")) / (7 * 86_400_000))));
    expect(weeks.size).toBeGreaterThanOrEqual(6);
    expect(mondays.size).toBeGreaterThanOrEqual(2);
    expect(rows.every((r) => Object.keys(r.subject_minutes).length > 0 && r.school_days > 0 && r.notes)).toBe(true);
    expect(rows.some((r) => r.books.length > 0)).toBe(true);
    // a run of days whose ticked days include a Saturday
    const saturday = rows.filter((r) => r.days?.some((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 6));
    expect(saturday.length).toBeGreaterThanOrEqual(2);
    // Wren never has a Monday ticked
    const wren = await q<{ days: string[] | null; start_date: string }>("SELECT r.days::text[], r.start_date::text FROM record_entry r JOIN child c ON c.id = r.child_id WHERE r.family_id = $1 AND c.name = 'Wren'", [first.hartleyFamilyId]);
    for (const w of wren) expect((w.days ?? [w.start_date]).every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 1)).toBe(true);
    // core and non-core: both kinds of subject are logged
    const core = await q<{ core: boolean }>("SELECT DISTINCT core FROM subject WHERE family_id = $1", [first.hartleyFamilyId]);
    expect(core.map((c) => c.core).sort()).toEqual([false, true]);
  });

  it("leaves no session or undo behind, and running it again replaces the family (same counts, new ids)", async () => {
    expect((await q<{ n: number }>("SELECT count(*)::int AS n FROM session WHERE family_id = ANY($1)", [[first.hartleyFamilyId, first.coopFamilyId]]))[0]!.n).toBe(0);
    expect((await q<{ n: number }>("SELECT count(*)::int AS n FROM undo_entry WHERE family_id = ANY($1)", [[first.hartleyFamilyId, first.coopFamilyId]]))[0]!.n).toBe(0);
    const again = await seedCmFamily(url);
    expect(again.counts).toEqual(first.counts);
    expect(again.hartleyFamilyId).not.toBe(first.hartleyFamilyId);
    expect((await q<{ n: number }>("SELECT count(*)::int AS n FROM family WHERE name = 'Hartley family'"))[0]!.n).toBe(1);
    expect((await q<{ n: number }>("SELECT count(*)::int AS n FROM parent WHERE email LIKE 'cm-%@example.com'"))[0]!.n).toBe(4);
  }, 120_000);
});
