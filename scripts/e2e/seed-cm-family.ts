/**
 * S17-03: a believable Charlotte Mason family for the end-to-end run (docs/e2e/cm-term-run-2.md). Dev databases only.
 *
 *   npm run e2e:seed                     builds the family in the *_dev database of DATABASE_URL (or the repo-root .env)
 *   npm run e2e:seed -- --reset          wipes and re-migrates that database first (a fresh dev database)
 *   npm run e2e:seed -- --url <url>      another *_dev database
 *
 * It REFUSES any database whose name does not end in `_dev`, and NODE_ENV=production. It prints local logins at the end: throwaway
 * passwords for this machine's dev database, no real secrets. Running it again replaces what it built (the accounts below, nothing else).
 *
 * Everything is made through the app's own API, in process (so every rule the app holds is held here, and the data is what a parent
 * could have made), dated as of Thursday Nov 5, 2026 (the middle of the Fall term): `SEED_TODAY`.
 *
 *   Hartley family   Rachel and Tom (parents), Elias 13, Clara 10, Wren 7; Fall Aug 17 - Dec 18, Spring Jan 4 - May 21; Thanksgiving week
 *                    and a Christmas break; Friday co-op; about 30 assignments; six weeks of typed log entries.
 *   Hearth Co-op     its own account (a co-op lead), Friday classes; Rachel and Tom are viewers of it.
 *   Grandma Joan     a viewer of the Hartley family.
 */
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { addDays } from "@hh/engine";
import { buildApp } from "../../apps/api/src/app";
import { SESSION_DAYS } from "../../apps/api/src/auth/session";
import { loadConfig } from "../../apps/api/src/config";
import { createPool } from "../../apps/api/src/db";
import { createInvite, redeemInvite } from "../../apps/api/src/services/invites";
import { databaseName, databaseUrlFromEnv, MIGRATIONS_DIR, migrate, reset } from "../../db/migrate";

/** What "today" is for everything the seed makes (the API's clock inside this script). */
export const SEED_TODAY = "2026-11-05";
const CLOCK = new Date("2026-11-05T17:00:00Z");

export interface Login { who: string; role: string; email: string; password: string }
export const LOGINS: readonly Login[] = [
  { who: "Rachel Hartley", role: "parent of the Hartley family (the first parent)", email: "cm-rachel@example.com", password: "cm-run-rachel-1" },
  { who: "Tom Hartley", role: "second parent; also a viewer of Hearth Co-op", email: "cm-tom@example.com", password: "cm-run-tom-1" },
  { who: "Grandma Joan", role: "viewer of the Hartley family (view only)", email: "cm-grandma@example.com", password: "cm-run-joan-1" },
  { who: "Hearth Co-op lead", role: "parent of the Hearth Co-op account", email: "cm-coop@example.com", password: "cm-run-coop-1" },
];
const [RACHEL, TOM, JOAN, COOP] = LOGINS as [Login, Login, Login, Login];

/** The database name must end in `_dev`, and this must not be production. Throws before anything is touched. */
export function assertDevDatabase(url: string, env: Record<string, string | undefined> = process.env): void {
  if (env.NODE_ENV === "production") throw new Error("refusing to seed a CM family with NODE_ENV=production");
  const name = databaseName(url);
  if (!/_dev$/.test(name)) throw new Error(`refusing to seed database "${name}": only databases ending in _dev are used for the end-to-end family`);
}

// ------------------------------------------------------------------------------------------------ the family's data

const COLORS = { blue: "#2f6fb0", coral: "#b0482f", mint: "#2f8f6f", lilac: "#7a5cc2", honey: "#b08a2f", sky: "#2f8fb0", butter: "#c25c8a", sage: "#5b6b7d", rose: "#b03a5c", leaf: "#4a8a3a", aqua: "#1f8a8f", plum: "#6a4fa0" } as const;

type Unit = "pages" | "chapters" | "lessons" | "minutes";
interface SubjectDef { name: string; color: string; icon: string; core: boolean }
/** Core: the subjects a state's hours usually count as core (math, language arts, science, social studies); the rest are the rest. */
const SUBJECTS: SubjectDef[] = [
  { name: "Bible", color: COLORS.sage, icon: "cross", core: false },
  { name: "Literature", color: COLORS.lilac, icon: "book", core: true },
  { name: "History", color: COLORS.honey, icon: "scroll", core: true },
  { name: "Geography", color: COLORS.sky, icon: "globe", core: true },
  { name: "Math", color: COLORS.mint, icon: "calculator", core: true },
  { name: "Nature study", color: COLORS.leaf, icon: "leaf", core: true },
  { name: "Picture study", color: COLORS.coral, icon: "palette", core: false },
  { name: "Composer study", color: COLORS.plum, icon: "music", core: false },
  { name: "Copywork", color: COLORS.butter, icon: "pencil", core: true },
  { name: "Recitation", color: COLORS.rose, icon: "star", core: false },
  { name: "Latin", color: COLORS.aqua, icon: "language", core: false },
];

type Kid = "Elias" | "Clara" | "Wren";
const MON_FRI = [1, 2, 3, 4, 5];
const TUE_FRI = [2, 3, 4, 5];
interface AssignmentDef {
  subject: string; title: string; unit: Unit; total: number; start: string; end: string; kids: Kid[]; weekdays?: number[] | null;
  /** How it stands on Nov 5: finished early (on that day), stopped (on that day), or running late (check-ins at about this share of the plan). */
  ended?: { as: "finished" | "stopped"; on: string }; late?: number;
}
const FALL_START = "2026-08-17";
const FALL_END = "2026-12-18";
const SPRING_START = "2027-01-04";
const SPRING_END = "2027-05-21";

const ASSIGNMENTS: AssignmentDef[] = [
  // Together: living books read aloud, and the weekly studies
  { subject: "Bible", title: "Gospel of Luke", unit: "chapters", total: 24, start: FALL_START, end: FALL_END, kids: ["Elias", "Clara", "Wren"], weekdays: [1, 2, 3, 4] },
  { subject: "Literature", title: "The Hobbit (read aloud)", unit: "pages", total: 300, start: "2026-08-24", end: "2026-12-11", kids: ["Elias", "Clara", "Wren"], weekdays: [1, 2, 3, 4] },
  { subject: "History", title: "Our Island Story", unit: "chapters", total: 40, start: FALL_START, end: FALL_END, kids: ["Clara", "Wren"] },
  { subject: "Picture study", title: "Picture study: Winslow Homer", unit: "lessons", total: 12, start: "2026-08-26", end: "2026-11-11", kids: ["Elias", "Clara", "Wren"], weekdays: [3] },
  { subject: "Composer study", title: "Composer study: Bach", unit: "lessons", total: 14, start: "2026-08-20", end: "2026-12-10", kids: ["Elias", "Clara", "Wren"], weekdays: [4] },
  { subject: "Nature study", title: "Nature walk and notebook", unit: "minutes", total: 1200, start: "2026-08-18", end: "2026-12-15", kids: ["Elias", "Clara", "Wren"], weekdays: [2] },
  { subject: "Recitation", title: "Poetry and Psalm 23 recitation", unit: "lessons", total: 60, start: FALL_START, end: FALL_END, kids: ["Elias", "Clara", "Wren"], weekdays: [1, 2, 3, 4] },
  // Elias, 13
  { subject: "Math", title: "Algebra 1", unit: "lessons", total: 140, start: FALL_START, end: FALL_END, kids: ["Elias"] },
  { subject: "Literature", title: "Robinson Crusoe", unit: "pages", total: 320, start: "2026-08-24", end: "2026-10-30", kids: ["Elias"], ended: { as: "finished", on: "2026-10-16" } },
  { subject: "Literature", title: "Treasure Island", unit: "pages", total: 290, start: "2026-11-02", end: FALL_END, kids: ["Elias"] },
  { subject: "History", title: "A Child's History of the World", unit: "pages", total: 400, start: "2026-08-31", end: FALL_END, kids: ["Elias"], late: 0.55 },
  { subject: "Geography", title: "Geography: Africa", unit: "chapters", total: 12, start: "2026-09-08", end: "2026-10-30", kids: ["Elias"] },
  { subject: "Nature study", title: "Fabre's Book of Insects", unit: "chapters", total: 20, start: "2026-09-01", end: FALL_END, kids: ["Elias"], weekdays: [1, 3] },
  { subject: "Latin", title: "Lingua Angelica", unit: "lessons", total: 36, start: FALL_START, end: FALL_END, kids: ["Elias"], weekdays: [1, 3, 5] },
  { subject: "Copywork", title: "Written narrations", unit: "lessons", total: 30, start: "2026-08-25", end: FALL_END, kids: ["Elias"], weekdays: [2, 4] },
  // Clara, 10
  { subject: "Math", title: "Math 5", unit: "lessons", total: 130, start: FALL_START, end: FALL_END, kids: ["Clara"] },
  { subject: "Literature", title: "Little Women", unit: "pages", total: 260, start: "2026-08-24", end: "2026-11-13", kids: ["Clara"] },
  { subject: "Literature", title: "Anne of Green Gables", unit: "pages", total: 300, start: "2026-11-16", end: "2027-01-29", kids: ["Clara"] },
  { subject: "Nature study", title: "Burgess Bird Book", unit: "chapters", total: 45, start: FALL_START, end: "2026-11-20", kids: ["Clara"], ended: { as: "finished", on: "2026-10-30" } },
  { subject: "Copywork", title: "Copywork: Proverbs", unit: "lessons", total: 60, start: FALL_START, end: FALL_END, kids: ["Clara"], weekdays: [1, 2, 3, 4] },
  { subject: "Latin", title: "Prima Latina", unit: "lessons", total: 30, start: "2026-08-24", end: FALL_END, kids: ["Clara"], weekdays: [1, 3, 5], ended: { as: "stopped", on: "2026-10-23" } },
  // Wren, 7: Tuesday to Friday, set on each of her assignments
  { subject: "Math", title: "Math 2", unit: "lessons", total: 110, start: FALL_START, end: FALL_END, kids: ["Wren"], weekdays: TUE_FRI },
  { subject: "Literature", title: "Pathway Readers", unit: "pages", total: 150, start: FALL_START, end: FALL_END, kids: ["Wren"], weekdays: TUE_FRI },
  { subject: "Copywork", title: "Manuscript copywork", unit: "lessons", total: 70, start: FALL_START, end: FALL_END, kids: ["Wren"], weekdays: TUE_FRI },
  { subject: "Literature", title: "Winnie-the-Pooh", unit: "chapters", total: 10, start: "2026-09-01", end: "2026-10-29", kids: ["Wren"], weekdays: TUE_FRI },
  { subject: "Nature study", title: "Nature notebook", unit: "minutes", total: 480, start: "2026-08-19", end: FALL_END, kids: ["Wren"], weekdays: [3] },
  // Spring
  { subject: "Literature", title: "Julius Caesar", unit: "pages", total: 120, start: SPRING_START, end: "2027-02-26", kids: ["Elias"] },
  { subject: "Math", title: "Math 5 (spring)", unit: "lessons", total: 120, start: SPRING_START, end: SPRING_END, kids: ["Clara"] },
  { subject: "Math", title: "Math 2 (spring)", unit: "lessons", total: 100, start: "2027-01-05", end: SPRING_END, kids: ["Wren"], weekdays: TUE_FRI },
  { subject: "Composer study", title: "Composer study: Mozart", unit: "lessons", total: 14, start: "2027-01-07", end: "2027-04-15", kids: ["Elias", "Clara", "Wren"], weekdays: [4] },
];

const BREAKS: { label: string; kind: "holiday" | "vacation" | "other"; startDate: string; endDate: string; who: Kid | null }[] = [
  { label: "Thanksgiving week", kind: "holiday", startDate: "2026-11-23", endDate: "2026-11-27", who: null },
  { label: "Christmas break", kind: "vacation", startDate: "2026-12-19", endDate: "2027-01-03", who: null },
  { label: "Dentist", kind: "other", startDate: "2026-10-14", endDate: "2026-10-14", who: "Clara" },
  { label: "Good Friday", kind: "holiday", startDate: "2027-03-26", endDate: "2027-03-26", who: null },
  { label: "Spring break", kind: "vacation", startDate: "2027-03-29", endDate: "2027-04-02", who: null },
];

/** The six logged weeks (Mondays). The week of Nov 2 is left to log in the run. */
const LOG_WEEKS = ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
/** Minutes per school day, by child and subject (a week is these times the days; each week varies a little). */
const DAILY: Record<Kid, Record<string, number>> = {
  Elias: { Math: 45, Literature: 30, History: 25, Geography: 10, Latin: 20, "Nature study": 15, Copywork: 15, Bible: 10, Recitation: 5 },
  Clara: { Math: 40, Literature: 30, History: 15, "Nature study": 15, Copywork: 15, Latin: 15, Bible: 10, Recitation: 5 },
  Wren: { Math: 25, Literature: 20, History: 10, Copywork: 10, Bible: 10, Recitation: 5 },
};
const NOTES: Record<Kid, string[]> = {
  Elias: ["Narrated three chapters of Crusoe aloud. Algebra: factoring went well.", "Latin quiz, one slip on the genitive. Long written narration on the Romans.", "Quick week. Finished the Crusoe test early.", "Catch-up Saturday for the dentist-day lessons.", "Chemistry demo at the co-op on Friday.", "Started Treasure Island. Algebra review."],
  Clara: ["Little Women, chapters 14 to 18. Bird walk by the creek.", "Copywork neat all week. Fractions are clicking.", "Botanical garden trip on Friday. Sketched maples.", "Dentist Wednesday. Made up Math on Saturday.", "Finished the Burgess Bird Book early.", "Latin set aside; we will decide at the end of term."],
  Wren: ["Read to me and then to herself. Number bonds to 10.", "Counting by fives. Copied her first Psalm line.", "Pooh chapter 8. Nature notebook: a woolly bear.", "Tuesday to Friday only, as planned.", "Poem by heart: The Wind. Hundred chart.", "Co-op Friday: pond life."],
};
const BOOKS: Record<Kid, string[][]> = {
  Elias: [["Robinson Crusoe"], ["Robinson Crusoe", "A Child's History of the World"], ["Robinson Crusoe"], ["A Child's History of the World"], ["Robinson Crusoe"], ["Treasure Island"]],
  Clara: [["Little Women"], ["Little Women", "Burgess Bird Book"], ["Little Women"], ["Little Women"], ["Burgess Bird Book"], ["Little Women"]],
  Wren: [["The Hobbit"], ["Pathway Readers"], ["Winnie-the-Pooh"], ["Winnie-the-Pooh"], ["Pathway Readers"], ["Winnie-the-Pooh", "The Hobbit"]],
};

// ------------------------------------------------------------------------------------------------ the builder

export interface CmSummary {
  databaseName: string;
  hartleyFamilyId: string;
  coopFamilyId: string;
  counts: { children: number; subjects: number; assignments: number; breaks: number; events: number; logEntries: number; viewers: number; parents: number };
  logins: readonly Login[];
}

interface Session { token: string }
type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** A weekday date list `from`..`to` inclusive that falls on one of `weekdays` (0 = Sunday). */
function daysIn(from: string, to: string, weekdays: readonly number[]): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (weekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay())) out.push(d);
  return out;
}

/** Wipes the accounts this script owns (families of the logins, and the viewer-only logins), so a second run starts clean. */
async function clearPrevious(pool: pg.Pool): Promise<void> {
  const emails = LOGINS.map((l) => l.email);
  await pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) = ANY($1) AND family_id IS NOT NULL)", [emails]);
  await pool.query("DELETE FROM parent WHERE lower(email) = ANY($1)", [emails]);
}

export async function seedCmFamily(databaseUrl: string, opts: { reset?: boolean; log?: (s: string) => void } = {}): Promise<CmSummary> {
  assertDevDatabase(databaseUrl);
  const log = opts.log ?? (() => {});
  if (opts.reset) await reset(databaseUrl, MIGRATIONS_DIR, log);
  else await migrate(databaseUrl, MIGRATIONS_DIR, log);

  const config = loadConfig({ DATABASE_URL: databaseUrl, SESSION_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "development", LOG_LEVEL: "silent" });
  const pool = createPool(config);
  const app = buildApp(config, { db: pool, now: () => CLOCK });
  await app.ready();
  let n = 0;
  const call = async (who: Session, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", url: string, payload?: object): Promise<Json> => {
    n += 1;
    const res = await app.inject({ method, url, cookies: { hh_session: who.token }, remoteAddress: `10.77.${(n >> 8) & 255}.${n & 255}`, ...(payload ? { payload } : {}) });
    if (res.statusCode >= 300) throw new Error(`${method} ${url} answered ${res.statusCode}: ${res.body.slice(0, 300)}`);
    return res.body ? res.json() : null;
  };

  try {
    await clearPrevious(pool);

    // Accounts. A parent's own family comes from a new-family invite; the second parent, the viewers and the co-op use the real invite code.
    const newFamily = async (l: Login) => {
      const invite = await createInvite(pool, { familyId: null, createdBy: null });
      const j = await redeemInvite(pool, invite.token, { type: "new", name: l.who, email: l.email, password: l.password }, SESSION_DAYS);
      return { familyId: j.familyId, parentId: j.parentId, session: { token: j.sessionToken! } };
    };
    const rachel = await newFamily(RACHEL);
    const coop = await newFamily(COOP);
    const join = async (familyId: string, createdBy: string, role: "parent" | "viewer", l: Login | { parentId: string }) => {
      const invite = await createInvite(pool, { familyId, createdBy, role, label: "who" in l ? l.who : null });
      return redeemInvite(pool, invite.token, "email" in l ? { type: "new", name: l.who, email: l.email, password: l.password } : { type: "person", parentId: l.parentId }, SESSION_DAYS);
    };
    const tom = await join(rachel.familyId, rachel.parentId, "parent", TOM);
    await join(rachel.familyId, rachel.parentId, "viewer", JOAN);
    await join(coop.familyId, coop.parentId, "viewer", { parentId: rachel.parentId });
    await join(coop.familyId, coop.parentId, "viewer", { parentId: tom.parentId });
    const R = rachel.session;
    const C = coop.session;

    // The Hartley family: settings, the school year, what the log tracks.
    await call(R, "PATCH", "/api/family", { name: "Hartley family", weekStart: "mon", schoolDays: MON_FRI, timeZone: "America/Chicago" });
    await call(R, "PATCH", "/api/family", { schoolYear: { start: FALL_START, end: SPRING_END, shape: "fall-spring" } });
    await call(R, "PATCH", "/api/family", { logSetup: { template: "custom", fields: { subjectHours: true, coreSplit: true, totalHours: false, schoolDays: true, homeAway: false, notes: true, books: true } } });
    // The two terms as the Fall and Spring views (the Year view and Records' ranges): Aug 17 to Dec 18 and Jan 4 to May 21.
    await call(R, "PATCH", "/api/family", { zoomViews: { hidden: [], custom: [], overrides: { fall: { name: "Fall", start: FALL_START, end: FALL_END }, spring: { name: "Spring", start: SPRING_START, end: SPRING_END } } } });
    await call(R, "PATCH", "/api/family", { setupDone: true, tipsSeen: ["bars", "edit", "icons"] });

    const kidIds = {} as Record<Kid, string>;
    const ages: Record<Kid, string> = { Elias: COLORS.blue, Clara: COLORS.rose, Wren: COLORS.mint };
    for (const k of ["Elias", "Clara", "Wren"] as Kid[]) kidIds[k] = (await call(R, "POST", "/api/children", { name: k, color: ages[k] })).id;
    const subjectIds: Record<string, string> = {};
    for (const s of SUBJECTS) subjectIds[s.name] = (await call(R, "POST", "/api/subjects", { name: s.name, color: s.color, icon: s.icon, core: s.core })).id;

    // The calendar: Thanksgiving week, the Christmas break, a dentist day for Clara, the spring days off.
    for (const b of BREAKS) await call(R, "POST", "/api/blocked-ranges", { label: b.label, kind: b.kind, startDate: b.startDate, endDate: b.endDate, childIds: b.who ? [kidIds[b.who]] : [] });
    // Friday co-op: the day is lighter (most of it is the co-op's), with nature and picture study left to the co-op itself.
    const everyone = Object.values(kidIds);
    const coopRules = { [subjectIds["Nature study"]!]: "skip", [subjectIds["Picture study"]!]: "skip" };
    await call(R, "POST", "/api/events", { name: "Co-op Friday (fall)", weekdays: [5], startDate: "2026-09-04", endDate: "2026-12-11", capacityFraction: 0.6, defaultRule: "lighter", subjectRules: coopRules, childIds: everyone });
    await call(R, "POST", "/api/events", { name: "Co-op Friday (spring)", weekdays: [5], startDate: "2027-01-08", endDate: "2027-05-14", capacityFraction: 0.6, defaultRule: "lighter", subjectRules: coopRules, childIds: everyone });

    // The assignments, then how they stand today.
    const assignmentIds = new Map<string, string>();
    for (const a of ASSIGNMENTS) {
      const made = await call(R, "POST", "/api/assignments", {
        subjectId: subjectIds[a.subject], title: a.title, unitType: a.unit, totalUnits: a.total, startDate: a.start, endDate: a.end,
        childIds: a.kids.map((k) => kidIds[k]), ...(a.weekdays ? { weekdays: a.weekdays } : {}),
      });
      assignmentIds.set(a.title, made.id);
      if (a.ended) await call(R, "PATCH", `/api/assignments/${made.id}`, { endedAs: a.ended.as, endedOn: a.ended.on });
    }
    // One running late: two weeks of check-ins at about half the plan (the plan keeps its end date, so it says it will finish late).
    for (const a of ASSIGNMENTS.filter((x) => x.late)) {
      const child = kidIds[a.kids[0]!], id = assignmentIds.get(a.title)!;
      for (const week of ["2026-10-12", "2026-10-19"]) {
        const plan = await call(R, "GET", `/api/plan?from=${a.start}&to=${a.end}`);
        const row = (plan.plans as Json[]).find((p) => p.assignmentId === id && p.childId === child);
        const days = row.days as { date: string; position: number }[];
        const before = days.filter((d) => d.date < week).at(-1)?.position ?? 0; // where the week starts: a check-in can't go below it
        const planned = days.find((d) => d.date === addDays(week, 4))!.position;
        const position = Math.round((before + (planned - before) * a.late!) * 100) / 100;
        await call(R, "PUT", `/api/check-ins/${week}`, { status: "reviewed", items: [{ assignmentId: id, childId: child, position, mode: "keepEndDate" }] });
      }
    }

    // Six weeks of typed log entries: one run per child per week (a Saturday catch-up in the fourth), a field trip day.
    const subjectMinutes = (kid: Kid, days: number, week: number) => {
      const out: Record<string, number> = {};
      for (const [name, perDay] of Object.entries(DAILY[kid])) out[subjectIds[name]!] = Math.round((perDay * days * (0.85 + ((week * 7 + name.length * 3) % 9) / 30)) / 5) * 5;
      return out;
    };
    let entries = 0;
    for (const [w, monday] of LOG_WEEKS.entries()) {
      for (const kid of ["Elias", "Clara", "Wren"] as Kid[]) {
        const school = kid === "Wren" ? TUE_FRI : MON_FRI;
        let from = monday, to = addDays(monday, 4), ticked: string[] | null = null;
        if (w === 2) to = addDays(monday, 3); // the Friday of week three is a field trip, logged on its own below
        if (w === 3 && kid !== "Wren") {
          // Elias missed Friday and caught up on Saturday; Clara had the dentist on Wednesday and also caught up on Saturday.
          to = addDays(monday, 5);
          ticked = (kid === "Elias" ? [0, 1, 2, 3, 5] : [0, 1, 3, 4, 5]).map((i) => addDays(monday, i));
        } else if (kid === "Wren") {
          from = addDays(monday, 1);
          if (w === 2) to = addDays(monday, 3);
          ticked = daysIn(from, to, school);
        }
        const dayCount = ticked ? ticked.length : daysIn(from, to, school).length;
        await call(R, "POST", "/api/log-entries", {
          childIds: [kidIds[kid]], startDate: from, endDate: to, countsSchoolDay: true, ...(ticked ? { days: ticked } : {}),
          subjectMinutes: subjectMinutes(kid, dayCount, w), notes: NOTES[kid][w]!, books: BOOKS[kid][w]!,
        });
        entries += 1;
      }
    }
    // The field trip: the Friday of week three, all three children, on its own.
    const trip = addDays(LOG_WEEKS[2]!, 4);
    for (const kid of ["Elias", "Clara", "Wren"] as Kid[]) {
      await call(R, "POST", "/api/log-entries", {
        childIds: [kidIds[kid]], startDate: trip, countsSchoolDay: true,
        subjectMinutes: { [subjectIds["Nature study"]!]: 90, [subjectIds["Picture study"]!]: 45 }, notes: "Botanical garden field trip with the co-op: sketched, collected leaves.", books: [],
      });
      entries += 1;
    }

    // Hearth Co-op: its own account with Friday classes; Rachel and Tom view it.
    await call(C, "PATCH", "/api/family", { name: "Hearth Co-op", weekStart: "mon", schoolDays: [5], timeZone: "America/Chicago" });
    await call(C, "PATCH", "/api/family", { setupDone: true, tipsSeen: ["bars", "edit", "icons"] });
    const coopKids: Record<string, string> = {};
    for (const k of ["Elias", "Clara", "Wren"]) coopKids[k] = (await call(C, "POST", "/api/children", { name: k, color: ages[k as Kid] })).id;
    const coopSubjects: Record<string, string> = {};
    for (const s of [{ name: "Nature lab", color: COLORS.leaf, icon: "leaf" }, { name: "Art workshop", color: COLORS.coral, icon: "palette" }, { name: "Latin circle", color: COLORS.aqua, icon: "language" }, { name: "Drama", color: COLORS.plum, icon: "star" }]) {
      coopSubjects[s.name] = (await call(C, "POST", "/api/subjects", s)).id;
    }
    const coopClasses: { subject: string; title: string; kids: string[]; total: number }[] = [
      { subject: "Nature lab", title: "Pond life", kids: ["Elias", "Clara", "Wren"], total: 14 },
      { subject: "Art workshop", title: "Watercolor basics", kids: ["Clara", "Wren"], total: 12 },
      { subject: "Latin circle", title: "Latin chants", kids: ["Elias", "Clara"], total: 14 },
      { subject: "Drama", title: "A Midsummer Night's Dream", kids: ["Elias", "Clara", "Wren"], total: 10 },
      { subject: "Nature lab", title: "Birds of the prairie", kids: ["Elias"], total: 12 },
    ];
    for (const c of coopClasses) {
      await call(C, "POST", "/api/assignments", { subjectId: coopSubjects[c.subject], title: c.title, unitType: "lessons", totalUnits: c.total, startDate: "2026-09-04", endDate: "2026-12-11", childIds: c.kids.map((k) => coopKids[k]), weekdays: [5] });
    }

    // Rachel and Tom open their own family when they sign in (the app opens the account used last; joining the co-op as viewers used it just now).
    await pool.query("UPDATE family_member SET last_used_at = now() + interval '1 minute' WHERE family_id = $1 AND role = 'parent'", [rachel.familyId]);

    // Leave no sessions behind (every login uses its password) and no "Undo" waiting from the build.
    const families = [rachel.familyId, coop.familyId];
    await pool.query("DELETE FROM session WHERE family_id = ANY($1)", [families]);
    await pool.query("DELETE FROM undo_entry WHERE family_id = ANY($1)", [families]);
    const counts = await pool.query<{ k: string; v: number }>(
      `SELECT 'children' AS k, count(*)::int AS v FROM child WHERE family_id = $1
       UNION ALL SELECT 'subjects', count(*)::int FROM subject WHERE family_id = $1
       UNION ALL SELECT 'assignments', count(*)::int FROM assignment WHERE family_id = $1
       UNION ALL SELECT 'breaks', count(*)::int FROM blocked_range WHERE family_id = $1
       UNION ALL SELECT 'events', count(*)::int FROM event WHERE family_id = $1
       UNION ALL SELECT 'logEntries', count(*)::int FROM record_entry WHERE family_id = $1
       UNION ALL SELECT 'viewers', count(*)::int FROM family_member WHERE family_id = $1 AND role = 'viewer'
       UNION ALL SELECT 'parents', count(*)::int FROM family_member WHERE family_id = $1 AND role = 'parent'`, [rachel.familyId]);
    const c = Object.fromEntries(counts.rows.map((r) => [r.k, r.v])) as CmSummary["counts"];
    if (c.logEntries !== entries) throw new Error(`expected ${entries} log entries, found ${c.logEntries}`);
    return { databaseName: databaseName(databaseUrl), hartleyFamilyId: rachel.familyId, coopFamilyId: coop.familyId, counts: c, logins: LOGINS };
  } finally {
    await app.close();
    await pool.end();
  }
}

export function banner(s: CmSummary): string {
  const c = s.counts;
  return [
    "",
    `The Hartley family is ready in "${s.databaseName}" (as of Thursday Nov 5, 2026).`,
    `  ${c.children} children, ${c.subjects} subjects, ${c.assignments} assignments, ${c.breaks} days off, ${c.events} co-op events, ${c.logEntries} log entries; ${c.parents} parents, ${c.viewers} viewer.`,
    "  Hearth Co-op is its own account; Rachel and Tom can switch to it as viewers.",
    "",
    "Local logins (this dev database only):",
    ...s.logins.map((l) => `  ${l.email}  /  ${l.password}    ${l.who}: ${l.role}`),
    "",
    "Start the app with `npm run dev:api` and `npm run dev:web`, then follow docs/e2e/cm-term-run-2.md.",
    "",
  ].join("\n");
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const unknown = args.filter((a, i) => !["--reset", "--url"].includes(a) && args[i - 1] !== "--url");
  if (unknown.length > 0) {
    console.error("usage: seed-cm-family [--reset] [--url <postgres url of a *_dev database>]");
    return 2;
  }
  const urlAt = args.indexOf("--url");
  try {
    const url = urlAt >= 0 ? args[urlAt + 1] : databaseUrlFromEnv();
    if (!url) throw new Error("--url needs a value");
    assertDevDatabase(url);
    const summary = await seedCmFamily(url, { reset: args.includes("--reset"), log: (s) => console.log(s) });
    console.log(banner(summary));
    return 0;
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().then((code) => process.exit(code));
}
