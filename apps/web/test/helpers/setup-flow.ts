/** A brand-new family for the setup-flow tests: PATCH /api/family changes what GET /api/me and /api/family say, as the real API does. */
import type { BlockedRange, Child, SetupDeferral, Subject, TipId } from "../../src/api/types";
import { defaultIconFor } from "../../src/features/subjects/icons";
import { DEMO_ME, fakeApi } from "./fake-api";

export interface NewFamily {
  me: typeof DEMO_ME;
  children: Child[];
  subjects: Subject[];
  blocked: BlockedRange[];
  schoolYear: { start: string; end: string } | null;
  zoomViews: { hidden: string[]; custom: unknown[]; overrides?: unknown };
}

export function newFamily(over: Partial<NewFamily["me"]> = {}): NewFamily {
  const f: NewFamily = {
    me: { ...DEMO_ME, name: "Fresh family", setupStep: 1, setupDone: false, setupDeferred: [], ...over },
    children: [], subjects: [], blocked: [], schoolYear: null, zoomViews: { hidden: [], custom: [] },
  };
  const settings = () => ({
    name: f.me.name, weekStart: f.me.weekStart, schoolDays: f.me.schoolDays, timeZone: f.me.timeZone, weekStartLocked: false,
    zoomViews: f.zoomViews, logSetup: null, setupStep: f.me.setupStep, setupDone: f.me.setupDone, setupDeferred: f.me.setupDeferred, schoolYear: f.schoolYear, tipsSeen: f.me.tipsSeen,
  });
  fakeApi.on("GET /api/me", () => [200, f.me]);
  fakeApi.on("GET /api/family", () => [200, settings()]);
  fakeApi.on("PATCH /api/family", (body) => {
    const b = body as Record<string, unknown>;
    if (b.name !== undefined) f.me.name = b.name as string;
    if (b.weekStart !== undefined) f.me.weekStart = b.weekStart as "mon" | "sun";
    if (b.schoolDays !== undefined) f.me.schoolDays = b.schoolDays as number[];
    if (b.setupStep !== undefined) f.me.setupStep = b.setupStep as number;
    if (b.setupDone) f.me.setupDone = true;
    if (b.tipsSeen !== undefined) f.me.tipsSeen = b.tipsSeen as TipId[];
    if (b.setupDeferred !== undefined) f.me.setupDeferred = b.setupDeferred as SetupDeferral[];
    if (b.zoomViews !== undefined) f.zoomViews = b.zoomViews as NewFamily["zoomViews"];
    if (b.schoolYear !== undefined) f.schoolYear = b.schoolYear as NewFamily["schoolYear"];
    return [200, settings()];
  });
  fakeApi.on("GET /api/children", () => [200, f.children]);
  fakeApi.on("POST /api/children", (body) => {
    const b = body as { name: string; color?: string };
    const c: Child = { id: `c${f.children.length + 1}`, name: b.name, color: b.color ?? null, sortOrder: f.children.length, archived: false };
    f.children.push(c);
    return [201, c];
  });
  fakeApi.on("GET /api/subjects", () => [200, f.subjects]);
  // As the API does: a subject created without an icon gets the one its name suggests.
  fakeApi.on("POST /api/subjects", (body) => {
    const b = body as { name: string; color?: string; icon?: string };
    const sub: Subject = { id: `s${f.subjects.length + 1}`, name: b.name, color: b.color ?? null, sortOrder: f.subjects.length, archived: false, defaultWeight: null, defaultWeekdays: null, icon: b.icon ?? defaultIconFor(b.name) };
    f.subjects.push(sub);
    return [201, sub];
  });
  fakeApi.on("GET /api/blocked-ranges", () => [200, f.blocked]);
  fakeApi.on("GET /api/assignments", 200, []);
  fakeApi.on("GET /api/events", 200, []);
  return f;
}

/** The PATCH /api/family bodies, in order. */
export const familyPatches = () => fakeApi.calls.filter((c) => c.method === "PATCH" && c.path === "/api/family").map((c) => c.body);
