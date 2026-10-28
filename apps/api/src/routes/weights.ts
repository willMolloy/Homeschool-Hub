/** /api/weights (S2b-09). Thin: parse, then the service does the work. */
import type { FastifyInstance } from "fastify";
import { withReadSnapshot } from "../db";
import { SuggestionQuery } from "../http/scheduleLimits";
import { parseBody } from "../http/validate";
import { weightSuggestion } from "../services/weightSuggestionService";

export async function weightsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/weights/suggestion", async (req) => {
    const q = parseBody(SuggestionQuery, req.query);
    // One snapshot, so the children, subject and history agree with each other.
    return withReadSnapshot(app.db, (tx) => weightSuggestion(tx, req.familyId, q));
  });
}
