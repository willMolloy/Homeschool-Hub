import { describe, expect, it } from "vitest";
import { fakeApi } from "./helpers/fake-api";

describe("fake API body-key check (RF-09)", () => {
  it("records a key the API would reject, and accepts the schema's keys", async () => {
    fakeApi.on("PATCH /api/children/c1", 200, {});
    fakeApi.on("POST /api/assignments", 201, {});
    await fetch("/api/children/c1", { method: "PATCH", body: JSON.stringify({ name: "A", archived: true }) });
    await fetch("/api/assignments", { method: "POST", body: JSON.stringify({ subjectId: "s", title: "t", colour: "#fff" }) });
    expect(fakeApi.bodyKeyViolations).toEqual(['POST /api/assignments: unknown key "colour"']);
    fakeApi.bodyKeyViolations = []; // setup.ts would fail this test otherwise
  });
});
