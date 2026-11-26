/** S22-07: a forked book is one row per child, and Use this for the rest keeps each row's own push-back day. */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BreakOverlap } from "@hh/engine";
import { describe, expect, it, vi } from "vitest";
import { BreakOverlapSheet } from "../src/features/schedule/BreakOverlapSheet";

const row = (childId: string, pushedEnd: string): BreakOverlap => ({
  breakIndex: 0, assignmentId: "book", title: "History spine", schoolDays: 5, dates: ["2026-02-02"],
  summary: "covers 5 school days in February", pushedEnd, shared: false, childId,
});

describe("the overlap sheet for a forked book (S22-07)", () => {
  it("names each child, and Use this for the rest uses that row's pushed day", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <BreakOverlapSheet
        rows={[row("elias", "2026-03-06"), row("margaret", "2026-03-13")]}
        proposed={[{ label: "February", start: "2026-02-01", end: "2026-02-28", childIds: [] }]}
        assignments={[{
          id: "book", title: "History spine", start: "2026-01-05", end: "2026-05-21", childIds: ["elias", "margaret"],
          weekdays: null, subjectId: "lit",
          children: [
            { childId: "elias", end: "2026-02-06", endedAs: null },
            { childId: "margaret", end: "2026-05-21", endedAs: null },
          ],
        }]}
        existing={[]}
        schoolDays={[1, 2, 3, 4, 5]}
        subjectWeekdays={[]}
        saving={false}
        error={null}
        childName={(id) => (id === "elias" ? "Elias" : "Margaret")}
        onCancel={() => {}}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("group", { name: "History spine · Elias" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "History spine · Margaret" })).toBeInTheDocument();
    const elias = screen.getByRole("group", { name: "History spine · Elias" });
    await user.click(within(elias).getByRole("radio", { name: /Push the end back/ }));
    await user.click(screen.getByRole("button", { name: "Use this for the rest" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    const saved = onConfirm.mock.calls[0]![0] as { childId: string; endDate: string }[];
    expect(saved.find((r) => r.childId === "elias")!.endDate).toBe("2026-03-06");
    expect(saved.find((r) => r.childId === "margaret")!.endDate).not.toBe("2026-03-06");
    expect(saved.find((r) => r.childId === "margaret")!.endDate).toBe("2026-05-28");
  });
});
