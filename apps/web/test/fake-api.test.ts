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

  it("flags the retired minutesPerUnit on assignment writes (S2b-13)", async () => {
    fakeApi.on("POST /api/assignments", 201, {});
    fakeApi.on("PATCH /api/assignments/a1", 200, {});
    await fetch("/api/assignments", { method: "POST", body: JSON.stringify({ title: "t", weightPerUnit: 1, minutesPerUnit: 2 }) });
    await fetch("/api/assignments/a1", { method: "PATCH", body: JSON.stringify({ minutesPerUnit: null }) });
    expect(fakeApi.bodyKeyViolations).toEqual([
      'POST /api/assignments: unknown key "minutesPerUnit"',
      'PATCH /api/assignments/a1: unknown key "minutesPerUnit"',
    ]);
    fakeApi.bodyKeyViolations = [];
  });
});
