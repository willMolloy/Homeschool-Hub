/**
 * A fake `fetch` for render tests: routes "METHOD /path" to a canned response.
 * Installed before every test by test/setup.ts with a signed-in family; override per test:
 *
 *   fakeApi.on("GET /api/me", 401, { error: "unauthenticated" });
 *   fakeApi.on("POST /api/children", (body) => [201, { ...body, id: "c9" }]);
 *   fakeApi.offline();               // every request fails like a network error
 *   fakeApi.calls                    // [{ method, path, body }]
 */
import type { Me } from "../../src/api/types";

type Reply = [status: number, body?: unknown];
type Handler = Reply | ((body: unknown, path: string) => Reply | Promise<Reply>);

export const DEMO_ME: Me = {
  familyId: "00000000-0000-4000-8000-000000000001",
  name: "Demo family",
  weekStart: "mon",
  schoolDays: [1, 2, 3, 4, 5],
  timeZone: "America/Chicago",
};

class FakeApi {
  calls: { method: string; path: string; body: unknown }[] = [];
  private routes = new Map<string, Handler>();
  private isOffline = false;

  reset() {
    this.calls = [];
    this.routes.clear();
    this.isOffline = false;
    this.on("GET /api/me", 200, DEMO_ME);
    this.on("POST /api/auth/logout", 204);
    this.on("GET /api/health", 200, { ok: true, engineVersion: "0.1.0", db: "ok" });
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
    if (this.isOffline) throw new TypeError("Failed to fetch");
    const handler = this.routes.get(`${method} ${url.pathname}${url.search}`) ?? this.routes.get(`${method} ${url.pathname}`);
    const [status, resBody] = handler === undefined
      ? [404, { error: "not_found", message: `fake-api: no route for ${method} ${url.pathname}` }]
      : typeof handler === "function" ? await handler(body, url.pathname) : handler;
    return new Response(resBody === undefined || status === 204 ? null : JSON.stringify(resBody), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
}

export const fakeApi = new FakeApi();
