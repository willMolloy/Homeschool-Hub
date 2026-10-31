/**
 * The only way web code talks to the API. Sends cookies, parses JSON, throws ApiError.
 *   status 0 + code 'network' = the request never got a response.
 */
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

let unauthenticatedHandler: (() => void) | null = null;

/** Register the callback that runs on any 401 (set by AuthProvider). Returns an unsubscribe. */
export function onUnauthenticated(fn: (() => void) | null): () => void {
  unauthenticatedHandler = fn;
  return () => {
    if (unauthenticatedHandler === fn) unauthenticatedHandler = null;
  };
}

/**
 * S6-08: requests that change the plan and so leave an undo entry on the API (S6-06): an assignment edit or reset, a
 * day off, a week adjustment. Creating an assignment is not one. The undo bar listens (`onPlanChange`) and asks what to offer.
 */
const PLAN_CHANGES: readonly (readonly [string, RegExp])[] = [
  ["PATCH", /^\/api\/assignments\/[^/]+$/],
  ["POST", /^\/api\/assignments\/[^/]+\/reset$/],
  ["POST", /^\/api\/blocked-ranges(\/bulk)?$/],
  ["PATCH", /^\/api\/blocked-ranges\/[^/]+$/],
  ["DELETE", /^\/api\/blocked-ranges\/[^/]+$/],
  ["PUT", /^\/api\/week-overrides$/],
  ["DELETE", /^\/api\/week-overrides\/[^/]+$/],
];
const planChangeListeners = new Set<() => void>();

/** Call `fn` after every successful plan-changing request. Returns an unsubscribe. */
export function onPlanChange(fn: () => void): () => void {
  planChangeListeners.add(fn);
  return () => { planChangeListeners.delete(fn); };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "include",
      headers: body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server.");
  }
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }
  if (!res.ok) {
    if (res.status === 401) unauthenticatedHandler?.();
    const e = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(res.status, typeof e.error === "string" ? e.error : "unknown", e.message);
  }
  const pathname = path.split("?")[0]!;
  if (PLAN_CHANGES.some(([m, re]) => m === method && re.test(pathname))) for (const fn of planChangeListeners) fn();
  return data as T;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {});
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
export const apiPut = <T>(path: string, body: unknown) => request<T>("PUT", path, body);
/** Sends no body (and so no content-type: Fastify rejects an empty JSON body). Resolves on 204. */
export const apiDelete = (path: string) => request<void>("DELETE", path);
