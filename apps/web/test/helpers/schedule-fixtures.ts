/** Children/subjects for the schedule screens (S2a-14..16). Ids are UUID-shaped like the real API. */
import type { Child, Subject } from "../../src/api/types";
import { fakeApi } from "./fake-api";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const FRANK: Child = { id: id(101), name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false };
export const MAGGIE: Child = { id: id(102), name: "Maggie", color: "#b0482f", sortOrder: 1, archived: false };
export const OLD_KID: Child = { id: id(103), name: "Old Kid", color: null, sortOrder: 2, archived: true };

export const MATH: Subject = { id: id(201), name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null };
export const READING: Subject = { id: id(202), name: "Reading", color: "#1f6f43", sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null };
export const LATIN: Subject = { id: id(203), name: "Latin", color: null, sortOrder: 2, archived: true, defaultWeight: null, defaultWeekdays: null };

export const rowId = (n: number) => id(300 + n);

/** Install GET /api/children and /api/subjects (archived included, as the screens ask). */
export function withRoster(children = [FRANK, MAGGIE, OLD_KID], subjects = [MATH, READING, LATIN]) {
  fakeApi.on("GET /api/children", 200, children);
  fakeApi.on("GET /api/subjects", 200, subjects);
}

/** PATCH handler that merges the body into the row whose id ends the path. */
export function patchMerging<T extends { id: string }>(...rows: T[]) {
  return (body: unknown, path: string): [number, unknown] => {
    const row = rows.find((r) => path.endsWith(r.id));
    return row ? [200, { ...row, ...(body as object) }] : [404, { error: "not_found", message: "Not found." }];
  };
}

/** Requests that change something. The event preview (S5-02) is a POST that only reads, so it isn't one. */
export const writes = () => fakeApi.calls.filter((c) => c.method !== "GET" && c.path !== "/api/plan/preview-event");
