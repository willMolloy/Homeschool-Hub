/** /api/undo (S6-06): what the last plan change was, and taking it back (one step, no redo). */
import type { FastifyInstance } from "fastify";
import { applyUndo, getUndo } from "../services/undoService";

export async function undoRoutes(app: FastifyInstance): Promise<void> {
  // `null` when there is nothing to undo.
  app.get("/api/undo", async (req, reply) => reply.send(await getUndo(app.db, req.familyId)));
  app.post("/api/undo", async (req) => applyUndo(app.db, req.familyId));
}
