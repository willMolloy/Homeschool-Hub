// Tester round 2: odd schedule data for the web smoke, in hh_dev via the running API (:3000). Remove with DELETE=1.
import pg from "pg";
import { hashPassword } from "/workspace/homeschool-hub/apps/api/src/auth/password";
const EMAIL = "tester2-odd@example.com";
const pool = new pg.Pool({ connectionString: "postgres://hh:hh@localhost:5432/hh_dev" });
await pool.query("DELETE FROM family WHERE login_email = $1", [EMAIL]);
if (process.env.DELETE) { console.log("deleted"); await pool.end(); process.exit(0); }
await pool.query(`INSERT INTO family (name, week_start, school_days, time_zone, login_email, password_hash) VALUES ($1, 'sun', '{0,2,4,6}', 'Asia/Kolkata', $2, $3)`,
  ["Ḟāmïly with a very long name that goes on and on — 60 chars!".slice(0, 60), EMAIL, await hashPassword("demo-password")]);
const B = "http://localhost:3000";
const login = await fetch(`${B}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: "demo-password" }) });
const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
const call = async (method: string, url: string, body?: unknown) => {
  const r = await fetch(B + url, { method, headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = r.status === 204 ? null : await r.json();
  if (r.status >= 300) throw new Error(`${method} ${url} ${r.status} ${JSON.stringify(j)}`);
  return j;
};
const kidNames = ["Maximilian-Alexander-Bartholomew-Christopherson-the-Third-xx", "زينب", "🦕🦖", "<b>Bold</b>", "Al", "Archived Kid"];
const kids: string[] = [];
for (const name of kidNames) kids.push((await call("POST", "/api/children", { name })).id);
const subjNames = ["Supercalifragilisticexpialidocious-Mathematics-Advanced-Lvl", "קריאה", "Music 🎻", "Old subject"];
const subj: string[] = [];
for (const name of subjNames) subj.push((await call("POST", "/api/subjects", { name })).id);
const L = "W".repeat(120);
await call("POST", "/api/assignments", { subjectId: subj[0], title: L, unitType: "pages", totalUnits: 99999.99, minutesPerUnit: 600, startDate: "2026-10-25", endDate: "2029-10-24", childIds: kids.slice(0, 5) });
await call("POST", "/api/assignments", { subjectId: subj[1], title: "ספר ארוך מאוד עם כותרת ארוכה מאוד מאוד", unitType: "chapters", totalUnits: 0.01, minutesPerUnit: null, startDate: "2026-11-01", endDate: "2026-11-01", childIds: [kids[1]] });
await call("POST", "/api/assignments", { subjectId: subj[3], title: "Uses a later-archived subject + child", unitType: "lessons", totalUnits: 12, startDate: "2026-10-26", endDate: "2026-12-18", childIds: [kids[4], kids[5]] });
await call("POST", "/api/assignments", { subjectId: subj[2], title: "Far future", unitType: "minutes", totalUnits: 100000, startDate: "2100-01-01", endDate: "2100-12-31", childIds: [kids[2]] });
await call("POST", "/api/events", { name: "E".repeat(120), weekdays: [0, 1, 2, 3, 4, 5, 6], capacityFraction: 0.001, defaultRule: "lighter", subjectRules: { [subj[0]]: "skip", [subj[1]]: "normal", [subj[2]]: "lighter", [subj[3]]: "skip" }, childIds: kids });
await call("POST", "/api/events", { name: "Open-ended co-op", weekdays: [2], startDate: null, endDate: null, capacityFraction: 0, defaultRule: "skip", childIds: [] });
await call("POST", "/api/events", { name: "Ends 2100", weekdays: [4, 6], startDate: "2000-01-01", endDate: "2100-12-31", subjectRules: { [subj[3]]: "lighter" }, childIds: [kids[5]] });
await call("POST", "/api/blocked-ranges", { label: "L".repeat(60), kind: "vacation", startDate: "2026-10-25", endDate: "2027-10-25", childIds: [] });
await call("POST", "/api/blocked-ranges", { label: "Overlap 1", kind: "sick", startDate: "2026-10-27", endDate: "2026-10-29", childIds: [kids[0], kids[5]] });
await call("POST", "/api/blocked-ranges", { label: "Overlap 1", kind: "sick", startDate: "2026-10-27", endDate: "2026-10-29", childIds: [kids[0], kids[5]] });
await call("POST", "/api/blocked-ranges", { label: null, kind: "other", startDate: "2100-12-31", endDate: "2100-12-31" });
await call("PATCH", `/api/children/${kids[5]}`, { archived: true });
await call("PATCH", `/api/subjects/${subj[3]}`, { archived: true });
console.log("seeded", EMAIL);
await pool.end();
