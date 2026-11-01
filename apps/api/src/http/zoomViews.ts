/**
 * S7-03: a family's timeline zoom views. Year is always shown; Fall, Spring and This month can be hidden; the family
 * may add up to 5 views of its own (a name and first and last day). At most 6 views are shown, Year included.
 * Mirrored in apps/web/src/features/timeline/zoomViews.ts.
 */
import { isValidLocalDate, toDayNumber } from "@hh/engine";
import { z } from "zod";
import { LocalDate } from "./scheduleLimits";
import { UUID_RE } from "./validate";

export const HIDEABLE_ZOOMS = ["fall", "spring", "month"] as const;
export const MAX_CUSTOM_ZOOMS = 5;
/** Year, the built-ins left showing and the custom views, all together. */
export const MAX_VISIBLE_ZOOMS = 6;
export const MAX_ZOOM_NAME = 30;
export const MAX_ZOOM_DAYS = 400;

const CustomView = z.strictObject({
  id: z.string("id must be a uuid.").regex(UUID_RE, "id must be a uuid."),
  name: z.string("Name is required.").trim().min(1, "Name is required.").max(MAX_ZOOM_NAME, `Name must be ${MAX_ZOOM_NAME} characters or fewer.`)
    .refine((s) => !s.includes("\u0000"), "Name can't contain a NUL character."),
  start: LocalDate,
  end: LocalDate,
});

export const ZoomViews = z
  .strictObject({
    hidden: z.array(z.enum(HIDEABLE_ZOOMS, "Only Fall, Spring and This month can be hidden; Year always shows."))
      .refine((h) => new Set(h).size === h.length, "A view can only be hidden once."),
    custom: z.array(CustomView).max(MAX_CUSTOM_ZOOMS, `You can add up to ${MAX_CUSTOM_ZOOMS} views of your own.`),
  })
  .superRefine((z3, ctx) => {
    z3.custom.forEach((v, i) => {
      // A bad date already has its own message (and can't be counted).
      if (!isValidLocalDate(v.start) || !isValidLocalDate(v.end)) return;
      const days = toDayNumber(v.end) - toDayNumber(v.start) + 1;
      if (days < 1) ctx.addIssue({ code: "custom", path: ["custom", i, "end"], message: "The last day must be on or after the first day." });
      else if (days > MAX_ZOOM_DAYS) ctx.addIssue({ code: "custom", path: ["custom", i, "end"], message: `A view can cover at most ${MAX_ZOOM_DAYS} days; this one covers ${days}.` });
    });
    if (new Set(z3.custom.map((v) => v.id)).size !== z3.custom.length)
      ctx.addIssue({ code: "custom", path: ["custom"], message: "Each view needs its own id." });
    const visible = 1 + (HIDEABLE_ZOOMS.length - z3.hidden.length) + z3.custom.length;
    if (visible > MAX_VISIBLE_ZOOMS) ctx.addIssue({ code: "custom", path: [], message: `You can show up to ${MAX_VISIBLE_ZOOMS} views; this shows ${visible}.` });
  });

export type ZoomViewsJson = z.infer<typeof ZoomViews>;
