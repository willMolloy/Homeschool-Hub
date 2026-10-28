import type { FastifyInstance } from "fastify";
import { HttpError } from "../app";

interface FamilyRow { id: string; name: string; week_start: "mon" | "sun"; school_days: number[] }
export interface MeResponse { familyId: string; name: string; weekStart: "mon" | "sun"; schoolDays: number[] }

export function toMe(row: FamilyRow): MeResponse {
  return { familyId: row.id, name: row.name, weekStart: row.week_start, schoolDays: row.school_days };
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(
      "SELECT id, name, week_start, school_days FROM family WHERE id = $1", [req.familyId]);
    if (!rows[0]) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
    return toMe(rows[0]);
  });
}
