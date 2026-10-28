import { seed, DEMO_PASSWORD, type SeedSummary } from "../../../../db/seed";
import { DATABASE_URL } from "./db";

/** Seed a private copy of the sample family (login `email` / demo-password) into the _test DB. */
export async function seedFamily(email: string): Promise<SeedSummary & { email: string; password: string }> {
  return { ...(await seed(DATABASE_URL!, email)), email, password: DEMO_PASSWORD };
}
