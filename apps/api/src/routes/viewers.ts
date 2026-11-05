/**
 * S15-01: the View-only access card of Family settings. Parents only (the viewer guard already refuses a viewer; each handler checks
 * the role again). Every query takes the family from the session; another family's link or viewer id finds nothing (404).
 * A parent sees each viewer's name and email (Will); no one else ever does.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { assertNotDemo } from "../auth/demo";
import { withTransaction } from "../db";
import { HttpError } from "../http/errors";
import { createInvite, listOpenInvites, revokeInvite } from "../services/invites";
import { removeViewer } from "../services/membership";

const IdParam = z.object({ id: z.string().uuid() });
const LinkBody = z.strictObject({ label: z.string().trim().max(60, "A label can be up to 60 characters.").refine((s) => !s.includes("\u0000"), "Check the label.").optional() });

function requireParent(req: FastifyRequest): void {
  if (req.role !== "parent") throw new HttpError(403, "view_only", "This account is view-only.");
}

export async function viewersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/family/viewers", async (req) => {
    requireParent(req);
    const links = await listOpenInvites(app.db, req.familyId, "viewer");
    const viewers = await app.db.query<{ id: string; name: string; email: string; created_at: Date }>(
      `SELECT p.id, p.name, p.email, m.created_at FROM family_member m JOIN parent p ON p.id = m.parent_id
        WHERE m.family_id = $1 AND m.role = 'viewer' ORDER BY m.created_at, p.id`, [req.familyId]);
    return {
      links: links.map((l) => ({ id: l.id, label: l.label, createdAt: l.createdAt, expiresAt: l.expiresAt })),
      viewers: viewers.rows.map((v) => ({ id: v.id, name: v.name, email: v.email, joinedAt: v.created_at.toISOString() })),
    };
  });

  // No cap on links (Will). The token is returned here, once; only its hash is stored.
  app.post("/api/family/view-links", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    requireParent(req);
    await assertNotDemo(app.db, req.familyId, "The demo family can't share view-only access.");
    const parsed = LinkBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Check what you typed.");
    const invite = await createInvite(app.db, { familyId: req.familyId, createdBy: req.parentId || null, role: "viewer", label: parsed.data.label || null });
    return reply.code(201).send({ id: invite.id, token: invite.token, expiresAt: invite.expiresAt });
  });

  app.delete("/api/family/view-links/:id", async (req, reply) => {
    requireParent(req);
    const params = IdParam.safeParse(req.params);
    if (!params.success || !(await revokeInvite(app.db, params.data.id, req.familyId, "viewer"))) throw new HttpError(404, "not_found", "Link not found.");
    return reply.code(204).send();
  });

  // Remove a viewer: their membership of THIS family only (their other accounts stay), and with it their sessions for it.
  app.delete("/api/family/viewers/:id", async (req, reply) => {
    requireParent(req);
    const params = IdParam.safeParse(req.params);
    if (!params.success) throw new HttpError(404, "not_found", "Viewer not found.");
    const removed = await withTransaction(app.db, (tx) => removeViewer(tx, req.familyId, params.data.id));
    if (!removed) throw new HttpError(404, "not_found", "Viewer not found.");
    return reply.code(204).send();
  });
}
