/**
 * Remove a parent from their family (S15-00). Only Will and DeeDee run this; there is no admin screen.
 *
 *   npm run remove-parent -w @hh/api -- <email>
 *
 * Removes that parent and ends all of their sessions. It refuses to remove a family's last parent (the family would have no way
 * in). The family's data and its other parents are untouched. Nothing is printed except the outcome.
 */
import { loadConfig, loadDotenv } from "../config";
import { createPool, withTransaction } from "../db";
import { EMAIL_RE } from "./prompt";

async function main(): Promise<number> {
  const [email] = process.argv.slice(2);
  if (!email || !EMAIL_RE.test(email)) {
    console.error("usage: remove-parent <email>");
    return 2;
  }
  loadDotenv();
  const pool = createPool(loadConfig(process.env));
  try {
    return await withTransaction(pool, async (tx) => {
      const found = await tx.query<{ id: string; family_id: string | null }>("SELECT id, family_id FROM parent WHERE lower(email) = lower($1)", [email.trim()]);
      const parent = found.rows[0];
      if (!parent) { console.error(`No parent with the email ${email.trim()}.`); return 1; }
      // Serialise with other removals from the same family, then count the parents who are left. (A person with no home family only
      // views other accounts, so there is no family to leave without a parent; they are simply removed.)
      if (parent.family_id) {
        await tx.query("SELECT 1 FROM family WHERE id = $1 FOR UPDATE", [parent.family_id]);
        const others = await tx.query("SELECT 1 FROM family_member WHERE family_id = $1 AND role = 'parent' AND parent_id <> $2", [parent.family_id, parent.id]);
        if (others.rowCount === 0) { console.error("That is the family's last parent, so it is not removed."); return 1; }
      }
      await tx.query("DELETE FROM session WHERE parent_id = $1", [parent.id]);
      await tx.query("DELETE FROM parent WHERE id = $1", [parent.id]);
      console.log(`Removed ${email.trim()} and signed them out.`);
      return 0;
    });
  } catch (e) {
    console.error(`Failed: ${(e as { message?: string }).message}`);
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
