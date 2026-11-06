/**
 * S17-01 (Sprint 14 N6): what a day off or break is called when the parent gave it no label, and the kind's name in the Kind list:
 * one set of words on every screen and on the printed sheets.
 */
import type { BlockedKind } from "@hh/engine";

export const KIND_NAMES: Record<BlockedKind, string> = { vacation: "Break", holiday: "Holiday", sick: "Sick day", other: "Day off", missed: "Missed day" };

/** The name of a day off: the parent's label, else its kind's shared name. */
export const dayOffTitle = (r: { label: string | null; kind: string }): string => r.label?.trim() || KIND_NAMES[r.kind as BlockedKind] || "Day off";
