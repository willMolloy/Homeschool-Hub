import { seed, DEMO_PASSWORD, type SeedSummary } from "../../../../db/seed";
import { SAMPLE_FAMILY } from "../../../../db/seed-data";
import { DATABASE_URL } from "./db";

/** Seed a private copy of the engine's sample family (not the richer demo family) (login `email` / demo-password) into the _test DB. */
export async function seedFamily(email: string): Promise<SeedSummary & { email: string; password: string }> {
  return { ...(await seed(DATABASE_URL!, email, SAMPLE_FAMILY)), email, password: DEMO_PASSWORD };
}
