import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { EngineMismatchBanner } from "../src/layout/EngineVersion";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

describe("Engine version", () => {
  it("footer shows the bundled engine version with the debug flag, and nothing for parents (T-03b)", async () => {
    renderAt("/kids?debug=1");
    const footer = await screen.findByRole("contentinfo");
    expect(footer).toHaveTextContent(`Engine ${ENGINE_VERSION}`);
    expect(ENGINE_VERSION).toBe("0.6.0");
  });

  it("parents get an empty footer (T-03b)", async () => {
    renderAt("/kids");
    await screen.findByRole("heading", { name: "Kids" });
    expect(screen.getByRole("contentinfo")).toBeEmptyDOMElement();
  });

  it("same version on the API → no banner; /api/health asked once", async () => {
    renderAt("/kids");
    await screen.findByRole("contentinfo");
    await vi.waitFor(() => expect(fakeApi.calls.some((c) => c.path === "/api/health")).toBe(true));
    expect(screen.queryByText("App update available — reload.")).not.toBeInTheDocument();
    expect(fakeApi.calls.filter((c) => c.path === "/api/health")).toHaveLength(1);
  });

  it("different version on the API → banner with Reload", async () => {
    fakeApi.on("GET /api/health", 200, { ok: true, engineVersion: "9.9.0", db: "ok" });
    renderAt("/kids");
    expect(await screen.findByText("App update available — reload.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(screen.getByText(/server has 9\.9\.0/)).toBeInTheDocument();
  });

  it("health check failing → no banner", async () => {
    fakeApi.on("GET /api/health", 500, { error: "internal_error" });
    renderAt("/kids");
    await screen.findByRole("contentinfo");
    await vi.waitFor(() => expect(fakeApi.calls.some((c) => c.path === "/api/health")).toBe(true));
    expect(screen.queryByText("App update available — reload.")).not.toBeInTheDocument();
  });

  it("Reload calls reload()", async () => {
    const reload = vi.fn();
    render(<EngineMismatchBanner apiVersion="9.9.9" reload={reload} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
