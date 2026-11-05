/**
 * The old name for setting a family's login (kept as an alias, S14-01): the family's first parent gets this email and password,
 * or a first parent is created when the family has none.
 *
 *   npm run set-family-login -w @hh/api -- <familyId> <email>
 *
 * To reset a parent's password by email, use `set-parent-login`. Prompts for the password without echoing it; piped, the first line
 * of stdin. Never printed.
 */
import { hashPassword } from "../auth/password";
import { passwordProblem } from "../auth/passwordRules";
import { loadConfig, loadDotenv } from "../config";
import { createPool } from "../db";
import { EMAIL_RE, UUID_RE, readNewPassword } from "./prompt";

async function main(): Promise<number> {
  const [familyId, email] = process.argv.slice(2);
  if (!familyId || !email || !UUID_RE.test(familyId) || !EMAIL_RE.test(email)) {
    console.error("usage: set-family-login <familyId (uuid)> <email>");
    return 2;
  }
  const password = await readNewPassword();
  if (password === null) return 1;
  const problem = passwordProblem(password);
  if (problem) { console.error(problem); return 1; }

  loadDotenv();
  const pool = createPool(loadConfig(process.env));
  try {
    const hash = await hashPassword(password);
    if ((await pool.query("SELECT 1 FROM family WHERE id = $1", [familyId])).rowCount === 0) { console.error(`No family with id ${familyId}.`); return 1; }
    const first = await pool.query<{ id: string }>("SELECT id FROM parent WHERE family_id = $1 ORDER BY created_at, id LIMIT 1", [familyId]);
    if (first.rows[0]) {
      await pool.query("UPDATE parent SET email = $2, password_hash = $3 WHERE id = $1", [first.rows[0].id, email.trim(), hash]);
    } else {
      await pool.query("INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, $2, $3, $4)",
        [familyId, email.trim().split("@")[0]!.slice(0, 100) || "Parent", email.trim(), hash]);
    }
    // A password change signs out every existing session of the family.
    await pool.query("DELETE FROM session WHERE family_id = $1", [familyId]);
    console.log(`Login set for family ${familyId}: ${email.trim()}`);
    return 0;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error(err.code === "23505" ? "That email is already used by another parent." : `Failed: ${err.message}`);
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
