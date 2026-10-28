import { z } from "zod";
import { HttpError } from "../app";

/** Display names for children and subjects: trimmed, 1–60 characters. */
export const Name = z.string().trim().min(1, "Name is required.").max(60, "Name must be 60 characters or fewer.");
/** `#RRGGBB`, stored lowercase. */
export const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must look like #RRGGBB.").transform((c) => c.toLowerCase());
/** Canonical uuid text; anything else in a URL is treated as "no such row". */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse a request body or throw 400 `invalid_request` with the first problem as the message. */
export function parseBody<S extends z.ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const r = schema.safeParse(body ?? {});
  if (!r.success) {
    const issue = r.error.issues[0];
    const where = issue && issue.path.length ? `${issue.path.join(".")}: ` : "";
    throw new HttpError(400, "invalid_request", issue ? `${where}${issue.message}` : "Invalid request.");
  }
  return r.data;
}
