/**
 * S9-03: what a family's records track. A template style is only a starting point; the fields are what counts.
 * Mirrored in apps/web/src/features/records/logSetup.ts. Never names a state.
 */
import { z } from "zod";

export const LOG_TEMPLATES = ["hoursBySubject", "coreNonCore", "daysAttended", "daysAndHours", "detailed", "custom"] as const;
export const LOG_FIELDS = ["subjectHours", "coreSplit", "totalHours", "schoolDays", "homeAway", "notes", "books"] as const;
export type LogField = (typeof LOG_FIELDS)[number];

const Switch = z.boolean("Each field is on or off.");

export const LogSetup = z
  .strictObject({
    template: z.enum(LOG_TEMPLATES, "Pick a template style."),
    fields: z.strictObject({
      subjectHours: Switch, coreSplit: Switch, totalHours: Switch, schoolDays: Switch, homeAway: Switch, notes: Switch, books: Switch,
    }),
  })
  .superRefine((s, ctx) => {
    const f = s.fields;
    if (!LOG_FIELDS.some((k) => f[k])) ctx.addIssue({ code: "custom", path: ["fields"], message: "Pick at least one thing to track." });
    if (f.coreSplit && !f.subjectHours) ctx.addIssue({ code: "custom", path: ["fields", "coreSplit"], message: "Core and non-core hours need hours by subject." });
    if (f.totalHours && f.subjectHours) ctx.addIssue({ code: "custom", path: ["fields", "totalHours"], message: "Total hours are for logs without hours by subject (the subjects add up to the total)." });
  });

export type LogSetupJson = z.infer<typeof LogSetup>;
