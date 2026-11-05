/**
 * S14-03: the Parents section of Family settings. Every query takes the family from the session; another family's invite id
 * finds nothing (404). Both parents have equal rights; there is no removing a parent here (Will: that is a command).
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assertNotDemo } from "../auth/demo";
import { HttpError } from "../http/errors";
import { createInvite, listOpenInvites, revokeInvite } from "../services/invites";

/** A family may hold this many open invites at once; cancel one to make another. */
export const MAX_OPEN_PARENT_INVITES = 5;
const IdParam = z.object({ id: z.string().uuid() });

export async function parentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/family/parents", async (req) => {
    const parents = await app.db.query<{ id: string; name: string }>("SELECT id, name FROM parent WHERE family_id = $1 ORDER BY created_at, id", [req.familyId]);
    const invites = await listOpenInvites(app.db, req.familyId);
    return {
      parents: parents.rows.map((p) => ({ id: p.id, name: p.name, you: p.id === req.parentId })),
      invites: invites.map((i) => ({ id: i.id, createdAt: i.createdAt, expiresAt: i.expiresAt })),
    };
  });

  // The link is returned here, once. Only its hash is stored, so the list above can never show it again.
  app.post("/api/family/invites", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    await assertNotDemo(app.db, req.familyId, "The demo family can't invite another parent.");
    if ((await listOpenInvites(app.db, req.familyId)).length >= MAX_OPEN_PARENT_INVITES) {
      throw new HttpError(409, "too_many_invites", "Cancel an invite you no longer need before making another.");
    }
    const invite = await createInvite(app.db, { familyId: req.familyId, createdBy: req.parentId || null });
    return reply.code(201).send({ id: invite.id, token: invite.token, expiresAt: invite.expiresAt });
  });

  app.delete("/api/family/invites/:id", async (req, reply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new HttpError(404, "not_found", "Invite not found.");
    if (!(await revokeInvite(app.db, params.data.id, req.familyId))) throw new HttpError(404, "not_found", "Invite not found.");
    return reply.code(204).send();
  });
}
