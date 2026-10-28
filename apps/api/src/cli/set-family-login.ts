/**
 * Set (or change) a family's login.
 *
 *   npm run set-family-login -w @hh/api -- <familyId> <email>
 *
 * Prompts for the password without echoing it. When stdin is not a terminal (scripts, tests)
 * the password is read from the first line of stdin. There is no signup screen in Sprint 1.
 */
import readline from "node:readline";
import { hashPassword } from "../auth/password";
import { loadConfig, loadDotenv } from "../config";
import { createPool } from "../db";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    process.stdout.write(prompt);
    out._writeToOutput = () => {}; // swallow echo
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function readLine(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin });
    let done = false;
    rl.once("line", (l) => { done = true; rl.close(); resolve(l); });
    rl.once("close", () => { if (!done) resolve(""); });
  });
}

async function main(): Promise<number> {
  const [familyId, email] = process.argv.slice(2);
  if (!familyId || !email || !UUID_RE.test(familyId) || !EMAIL_RE.test(email)) {
    console.error("usage: set-family-login <familyId (uuid)> <email>");
    return 2;
  }
  let password: string;
  if (process.stdin.isTTY) {
    password = await readHidden("Password: ");
    const again = await readHidden("Again: ");
    if (password !== again) { console.error("Passwords do not match."); return 1; }
  } else {
    password = await readLine();
  }
  if (password.length < 8) { console.error("Password must be at least 8 characters."); return 1; }

  loadDotenv();
  const config = loadConfig(process.env);
  const pool = createPool(config);
  try {
    const hash = await hashPassword(password);
    const res = await pool.query(
      "UPDATE family SET login_email = $2, password_hash = $3, updated_at = now() WHERE id = $1",
      [familyId, email.trim(), hash],
    );
    if (res.rowCount === 0) { console.error(`No family with id ${familyId}.`); return 1; }
    // A password change signs out every existing session.
    await pool.query("DELETE FROM session WHERE family_id = $1", [familyId]);
    console.log(`Login set for family ${familyId}: ${email.trim()}`);
    return 0;
  } catch (e) {
    const err = e as { code?: string; message?: string };
    console.error(err.code === "23505" ? "That email is already used by another family." : `Failed: ${err.message}`);
    return 1;
  } finally {
    await pool.end();
  }
}

main().then((code) => process.exit(code));
