/**
 * Reset a parent's password (S14-01).
 *
 *   npm run set-parent-login -w @hh/api -- <email>
 *
 * Prompts for the new password without echoing it (from a pipe, the first line of stdin). Signs that parent out everywhere.
 * Password resets are manual (no email provider). The password is never printed.
 */
import { hashPassword } from "../auth/password";
import { passwordProblem } from "../auth/passwordRules";
import { loadConfig, loadDotenv } from "../config";
import { createPool } from "../db";
import { EMAIL_RE, readNewPassword } from "./prompt";

async function main(): Promise<number> {
  const [email] = process.argv.slice(2);
  if (!email || !EMAIL_RE.test(email)) {
    console.error("usage: set-parent-login <email>");
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
    const res = await pool.query<{ id: string }>("UPDATE parent SET password_hash = $2 WHERE lower(email) = lower($1) RETURNING id", [email.trim(), hash]);
    if (res.rowCount === 0) { console.error(`No parent with the email ${email.trim()}.`); return 1; }
    // A password change signs that parent out everywhere.
    await pool.query("DELETE FROM session WHERE parent_id = $1", [res.rows[0]!.id]);
    console.log(`Password changed for ${email.trim()}.`);
    return 0;
  } catch (e) {
    console.error(`Failed: ${(e as { message?: string }).message}`);
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
