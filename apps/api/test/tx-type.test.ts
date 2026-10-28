/**
 * RF-11: multi-statement repo functions take a `Tx`, so the pool (or a bare client) is a compile error.
 * The `@ts-expect-error` lines are the real test: `npm run typecheck` fails if any of them stops erroring.
 * The functions are never called; the runtime test only keeps vitest from reporting an empty file.
 */
import type pg from "pg";
import { describe, expect, it } from "vitest";
import type { ReadTx, Tx } from "../src/db";
import { createAssignment, lockAssignment, updateAssignment } from "../src/repos/assignmentRepo";
import { createBlockedRange, updateBlockedRange } from "../src/repos/blockedRangeRepo";
import { createChild, listChildren } from "../src/repos/childRepo";
import { createEvent, getEvent, updateEvent } from "../src/repos/eventRepo";
import { createSubject } from "../src/repos/subjectRepo";

declare const pool: pg.Pool;
declare const client: pg.PoolClient;
declare const readTx: ReadTx;
declare const tx: Tx;

export function typeChecks(): void {
  // @ts-expect-error the pool is not a transaction
  void createAssignment(pool, "f", {} as never);
  // @ts-expect-error a bare checked-out client is not a transaction either
  void createAssignment(client, "f", {} as never);
  // @ts-expect-error a read snapshot can't be used for writes
  void updateAssignment(readTx, "f", "id", {});
  // @ts-expect-error the pool is not a transaction
  void lockAssignment(pool, "f", "id");
  // @ts-expect-error the pool is not a transaction
  void createEvent(pool, "f", {} as never);
  // @ts-expect-error the pool is not a transaction
  void updateEvent(pool, "f", "id", {});
  // @ts-expect-error the pool is not a transaction
  void createBlockedRange(pool, "f", {} as never);
  // @ts-expect-error the pool is not a transaction
  void updateBlockedRange(pool, "f", "id", {});
  // @ts-expect-error roster create takes an advisory lock, so it needs the caller's transaction
  void createChild(pool, "f", { name: "x" });
  // @ts-expect-error the pool is not a transaction
  void createSubject(pool, "f", { name: "x" });

  // Allowed: a Tx anywhere, and single reads on the pool, a client or a snapshot.
  void createAssignment(tx, "f", {} as never);
  void createChild(tx, "f", { name: "x" });
  void listChildren(pool, "f");
  void getEvent(readTx, "f", "id");
  void getEvent(tx, "f", "id");
}

describe("Tx type", () => {
  it("is enforced at compile time (see the @ts-expect-error lines)", () => {
    expect(typeof typeChecks).toBe("function");
  });
});
