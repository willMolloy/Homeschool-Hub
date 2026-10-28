import type pg from "pg";
import { hashPassword } from "../../src/auth/password";

/** Insert a family with a login. Use a unique email per test file; delete it in afterAll. */
export async function createFamily(pool: pg.Pool, email: string, password: string, name = "Test family"): Promise<string> {
  await pool.query("DELETE FROM family WHERE lower(login_email) = lower($1)", [email]);
  const { rows } = await pool.query(
    "INSERT INTO family (name, login_email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [name, email, await hashPassword(password)]);
  return rows[0].id;
}

/** Value of the hh_session cookie from a Set-Cookie header, or undefined. */
export function sessionCookie(res: { cookies: { name: string; value: string }[] }): string | undefined {
  return res.cookies.find((c) => c.name === "hh_session")?.value;
}
