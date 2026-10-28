import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, onUnauthenticated } from "../src/api/client";

const json = (status: number, body: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthenticated(null);
});

describe("api client", () => {
  it("200 → parsed body, with cookies and JSON headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { familyId: "f1" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiGet("/api/me")).resolves.toEqual({ familyId: "f1" });
    expect(fetchMock).toHaveBeenCalledWith("/api/me", expect.objectContaining({ method: "GET", credentials: "include" }));
  });

  it("POST/PATCH send a JSON body", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => json(201, { id: "c1" }));
    vi.stubGlobal("fetch", fetchMock);
    await apiPost("/api/children", { name: "Ann" });
    await apiPatch("/api/children/c1", { archived: true });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: "POST", body: '{"name":"Ann"}', headers: { "content-type": "application/json" } });
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: "PATCH", body: '{"archived":true}' });
  });

  it("204 → undefined", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiPost("/api/auth/logout")).resolves.toBeUndefined();
  });

  it("DELETE sends no body or content-type; 204 → undefined", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiDelete("/api/blocked-ranges/b1")).resolves.toBeUndefined();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init).toMatchObject({ method: "DELETE", credentials: "include" });
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty("content-type");
  });

  it("404 JSON → ApiError with status and code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(404, { error: "not_found", message: "No such child" })));
    const e = await apiGet("/api/children/x").catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 404, code: "not_found", message: "No such child" });
  });

  it("non-JSON error body → code 'unknown'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>bad gateway</html>", { status: 502 })));
    await expect(apiGet("/api/me")).rejects.toMatchObject({ status: 502, code: "unknown" });
  });

  it("network error → status 0, code network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiGet("/api/me")).rejects.toMatchObject({ status: 0, code: "network" });
  });

  it("401 → onUnauthenticated called (and still throws)", async () => {
    const handler = vi.fn();
    onUnauthenticated(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, { error: "unauthenticated" })));
    await expect(apiGet("/api/me")).rejects.toMatchObject({ status: 401, code: "unauthenticated" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
