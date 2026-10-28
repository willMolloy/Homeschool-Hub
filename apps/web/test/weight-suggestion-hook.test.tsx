import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UnitType } from "../src/api/types";
import { useWeightSuggestion } from "../src/features/schedule/useWeightSuggestion";
import { builtinSuggestionFor, fakeApi } from "./helpers/fake-api";

type Props = { unit: UnitType; kids: string[]; enabled: boolean };

/** S2c-04: `pending` is true until the answer for the current inputs is in, debounce included. */
describe("useWeightSuggestion pending", () => {
  const render = (initial: Props) =>
    renderHook(({ unit, kids, enabled }: Props) => useWeightSuggestion(unit, kids, "", enabled), { initialProps: initial });

  it("pending until the first answer, again after an input change, keeping the old answer on show", async () => {
    let release: (() => void) | null = null;
    fakeApi.on("GET /api/weights/suggestion", (_b, _p, q) => new Promise((resolve) => {
      release = () => resolve([200, { ...builtinSuggestionFor(q), weightPerUnit: q.get("childIds") === "b" ? 2 : 1 }]);
    }));
    const { result, rerender } = render({ unit: "pages", kids: ["a"], enabled: true });
    expect(result.current).toEqual({ suggestion: null, pending: true });
    await waitFor(() => expect(release).not.toBeNull());
    release!();
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.suggestion?.weightPerUnit).toBe(1);

    release = null;
    rerender({ unit: "pages", kids: ["b"], enabled: true });
    // The previous answer stays on show (no flicker) but isn't for these inputs.
    expect(result.current.pending).toBe(true);
    expect(result.current.suggestion?.weightPerUnit).toBe(1);
    await waitFor(() => expect(release).not.toBeNull());
    expect(result.current.pending).toBe(true);
    release!();
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.suggestion?.weightPerUnit).toBe(2);
  });

  it("the same children in another order isn't a new input", async () => {
    const { result, rerender } = render({ unit: "pages", kids: ["a", "b"], enabled: true });
    await waitFor(() => expect(result.current.pending).toBe(false));
    rerender({ unit: "pages", kids: ["b", "a"], enabled: true });
    expect(result.current.pending).toBe(false);
  });

  it("a failed request settles on the built-in, not pending", async () => {
    fakeApi.on("GET /api/weights/suggestion", 500, { error: "internal" });
    const { result } = render({ unit: "chapters", kids: [], enabled: true });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.suggestion).toMatchObject({ source: "builtin", unitType: "chapters" });
  });

  it("disabled: no request, nothing pending", () => {
    const { result } = render({ unit: "pages", kids: ["a"], enabled: false });
    expect(result.current).toEqual({ suggestion: null, pending: false });
  });
});
