/** GET /api/timezones (S2a-17): the zones PATCH /api/family accepts, from the server's own ICU data. */
import type { FastifyInstance } from "fastify";
import { timeZoneList } from "../http/timeZone";

export interface TimeZonesResponse { zones: string[] }

export async function timeZonesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/timezones", async (): Promise<TimeZonesResponse> => ({ zones: timeZoneList() }));
}
