/**
 * A fake `fetch` for render tests: routes "METHOD /path" to a canned response.
 * Installed before every test by test/setup.ts with a signed-in family; override per test:
 *
 *   fakeApi.on("GET /api/me", 401, { error: "unauthenticated" });
 *   fakeApi.on("POST /api/children", (body) => [201, { ...body, id: "c9" }]);
 *   fakeApi.offline();               // every request fails like a network error
 *   fakeApi.calls                    // [{ method, path, body }]
 *
 * The API rejects unknown body keys (RF-09), so the fake records any body key not in
 * BODY_KEYS as a violation and test/setup.ts fails the test.
 */
import { DEFAULT_WEIGHT_PER_UNIT, ENGINE_VERSION, isLearnedUnit, type UnitType } from "@hh/engine";
import type { Me } from "../../src/api/types";

type Reply = [status: number, body?: unknown];
type Handler = Reply | ((body: unknown, path: string, query: URLSearchParams) => Reply | Promise<Reply>);

/** The answer the real endpoint gives with no history and no subject default. */
export function builtinSuggestionFor(q: URLSearchParams) {
  const unitType = (q.get("unitType") ?? "pages") as UnitType;
  const childIds = q.get("childIds")?.split(",") ?? [];
  return {
    unitType, weightPerUnit: DEFAULT_WEIGHT_PER_UNIT[unitType], source: "builtin", builtInDefault: DEFAULT_WEIGHT_PER_UNIT[unitType],
    subjectDefault: null, learned: isLearnedUnit(unitType),
    children: childIds.map((childId) => ({ childId, name: childId, usual: null, choices: 0 })),
  };
}

export const DEMO_ME: Me = {
  familyId: "00000000-0000-4000-8000-000000000001",
  name: "Demo family",
  weekStart: "mon",
  schoolDays: [1, 2, 3, 4, 5],
  timeZone: "America/Chicago",
  today: "2026-10-28",
  demo: false,
};

const ROSTER_PATCH = ["name", "color", "sortOrder", "archived"];
const ASSIGNMENT = ["subjectId", "title", "unitType", "totalUnits", "weightPerUnit", "startDate", "endDate", "childIds", "weekdays"];
const EVENT = ["name", "weekdays", "startDate", "endDate", "capacityFraction", "defaultRule", "subjectRules", "childIds"];
const BLOCKED = ["label", "kind", "startDate", "endDate", "childIds"];
/** The keys each API body schema accepts (apps/api/src/routes/*, all z.strictObject). `:id` = one path segment. */
export const BODY_KEYS: Record<string, readonly string[]> = {
  "POST /api/auth/login": ["email", "password"],
  "PATCH /api/family": ["name", "weekStart", "schoolDays", "timeZone"],
  "POST /api/children": ["name", "color"],
  "PATCH /api/children/:id": ROSTER_PATCH,
  "POST /api/subjects": ["name", "color", "defaultWeight", "defaultWeekdays"],
  "PATCH /api/subjects/:id": [...ROSTER_PATCH, "defaultWeight", "defaultWeekdays"],
  "POST /api/assignments": ASSIGNMENT,
  "PATCH /api/assignments/:id": [...ASSIGNMENT, "archived"],
  "POST /api/events": EVENT,
  "PATCH /api/events/:id": [...EVENT, "archived"],
  "POST /api/blocked-ranges": BLOCKED,
  "PATCH /api/blocked-ranges/:id": BLOCKED,
  "PUT /api/check-ins/:id": ["status", "items"],
};

/** S2b-25: last week as GET /api/check-ins returns it with nothing planned, so the card stays hidden by default. */
export const EMPTY_WEEK = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [], addable: [] };

function bodyKeyProblems(method: string, pathname: string, body: unknown): string[] {
  if (body === undefined || method === "GET") return [];
  const allowed = BODY_KEYS[`${method} ${pathname}`] ?? BODY_KEYS[`${method} ${pathname.replace(/\/[^/]+$/, "/:id")}`];
  if (!allowed) return [];
  if (typeof body !== "object" || body === null || Array.isArray(body)) return [`${method} ${pathname}: body is not an object`];
  return Object.keys(body).filter((k) => !allowed.includes(k)).map((k) => `${method} ${pathname}: unknown key "${k}"`);
}

class FakeApi {
  calls: { method: string; path: string; body: unknown }[] = [];
  /** Bodies the real API would reject with 400 for an unknown key. */
  bodyKeyViolations: string[] = [];
  private routes = new Map<string, Handler>();
  private isOffline = false;

  reset() {
    this.calls = [];
    this.bodyKeyViolations = [];
    this.routes.clear();
    this.isOffline = false;
    this.on("GET /api/me", 200, DEMO_ME);
    this.on("POST /api/auth/logout", 204);
    this.on("GET /api/timezones", 200, { zones: ["America/Chicago", "America/New_York", "Asia/Kolkata", "Europe/London", "UTC"] });
    this.on("GET /api/health", 200, { ok: true, engineVersion: ENGINE_VERSION, db: "ok" });
    // S2b-11: no history and no subject default, so the built-in. Tests override it for learned/subject cases.
    this.on("GET /api/weights/suggestion", (_b, _p, q) => [200, builtinSuggestionFor(q)]);
    // S2b-25: no work last week (card hidden); a save echoes the week back as reviewed or skipped.
    this.on("GET /api/check-ins", 200, EMPTY_WEEK);
    this.on("GET /api/check-ins/weeks", 200, { weeks: [] });
    this.on(`PUT /api/check-ins/${EMPTY_WEEK.weekStart}`, (body) =>
      [200, { ...EMPTY_WEEK, status: (body as { status: string }).status, planChanged: false }]);
  }

  on(key: string, statusOrFn: number | Handler, body?: unknown) {
    this.routes.set(key, typeof statusOrFn === "number" ? [statusOrFn, body] : statusOrFn);
    return this;
  }

  offline() {
    this.isOffline = true;
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input), "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    this.calls.push({ method, path: url.pathname + url.search, body });
    this.bodyKeyViolations.push(...bodyKeyProblems(method, url.pathname, body));
    if (this.isOffline) throw new TypeError("Failed to fetch");
    const handler = this.routes.get(`${method} ${url.pathname}${url.search}`) ?? this.routes.get(`${method} ${url.pathname}`);
    const [status, resBody] = handler === undefined
      ? [404, { error: "not_found", message: `fake-api: no route for ${method} ${url.pathname}` }]
      : typeof handler === "function" ? await handler(body, url.pathname, url.searchParams) : handler;
    return new Response(resBody === undefined || status === 204 ? null : JSON.stringify(resBody), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
}

export const fakeApi = new FakeApi();
