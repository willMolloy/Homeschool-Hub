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
  return data as T;
}

export const apiGet = <T>(path: string) => request<T>("GET", path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {});
export const apiPatch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
/** Sends no body (and so no content-type: Fastify rejects an empty JSON body). Resolves on 204. */
export const apiDelete = (path: string) => request<void>("DELETE", path);
