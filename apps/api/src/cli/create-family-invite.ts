/**
 * Invite links for new families (S14-02). Only Will and DeeDee run this; there is no admin screen.
 *
 *   npm run create-family-invite -w @hh/api                 make an invite and print its link (once)
 *   npm run create-family-invite -w @hh/api -- list         the open invites (no links: they are not stored)
 *   npm run create-family-invite -w @hh/api -- revoke <id>  cancel an open invite (the full id, or its first 8 or more characters)
 *
 * The link is `${PUBLIC_BASE_URL or http://localhost:5173}/join/<token>`. It is single use and lasts 7 days. Only the token's
 * SHA-256 is stored, so the link cannot be shown again: make another if it is lost. The command sends nothing anywhere; share the
 * link by hand.
 */
import { loadConfig, loadDotenv } from "../config";
import { createPool } from "../db";
import { INVITE_DAYS, createInvite, listOpenInvites, revokeInvite } from "../services/invites";

const ID_PREFIX_RE = /^[0-9a-f-]{8,36}$/i;

async function main(): Promise<number> {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd !== undefined && cmd !== "list" && cmd !== "revoke") {
    console.error("usage: create-family-invite [list | revoke <id>]");
    return 2;
  }
  if (cmd === "revoke" && (!arg || !ID_PREFIX_RE.test(arg))) {
    console.error("usage: create-family-invite revoke <id>   (the id from `list`: at least its first 8 characters)");
    return 2;
  }
  loadDotenv();
  const pool = createPool(loadConfig(process.env));
  try {
    if (cmd === "list") {
      const open = await listOpenInvites(pool);
      if (open.length === 0) console.log("No open invites.");
      for (const i of open) console.log(`${i.id}  ${i.kind === "new_family" ? "new family" : `parent of ${i.familyName ?? "a family"}`}  made ${i.createdAt.slice(0, 16).replace("T", " ")}  expires ${i.expiresAt.slice(0, 16).replace("T", " ")} UTC`);
      return 0;
    }
    if (cmd === "revoke") {
      const open = (await listOpenInvites(pool)).filter((i) => i.id.startsWith(arg!.toLowerCase()));
      if (open.length === 0) { console.error("No open invite with that id."); return 1; }
      if (open.length > 1) { console.error("More than one open invite starts with that; give more of the id."); return 1; }
      await revokeInvite(pool, open[0]!.id);
      console.log(`Cancelled invite ${open[0]!.id}.`);
      return 0;
    }
    const invite = await createInvite(pool, { familyId: null, createdBy: null });
    const base = (process.env.PUBLIC_BASE_URL ?? "http://localhost:5173").replace(/\/+$/, "");
    console.log(`Invite ${invite.id} (single use, expires in ${INVITE_DAYS} days, ${invite.expiresAt.slice(0, 10)}).`);
    console.log("Share this link by hand. It is shown only now and cannot be found again:");
    console.log(`${base}/join/${invite.token}`);
    return 0;
  } catch (e) {
    console.error(`Failed: ${(e as { message?: string }).message}`);
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
