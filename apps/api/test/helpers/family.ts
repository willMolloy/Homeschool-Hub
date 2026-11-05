import type pg from "pg";
import { hashPassword } from "../../src/auth/password";

/** Insert a family with a first parent (S14-01: the login is a parent row). Use a unique email per test file; delete it in afterAll. */
export async function createFamily(pool: pg.Pool, email: string, password: string, name = "Test family"): Promise<string> {
  await pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) = lower($1))", [email]);
  const { rows } = await pool.query("INSERT INTO family (name) VALUES ($1) RETURNING id", [name]);
  await pool.query("INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, 'Test parent', $2, $3)", [rows[0].id, email, await hashPassword(password)]);
  return rows[0].id;
}

/** Value of the hh_session cookie from a Set-Cookie header, or undefined. */
export function sessionCookie(res: { cookies: { name: string; value: string }[] }): string | undefined {
  return res.cookies.find((c) => c.name === "hh_session")?.value;
}
