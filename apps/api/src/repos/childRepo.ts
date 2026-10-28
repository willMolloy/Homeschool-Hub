import type { Queryable, Tx } from "../db";
import { rosterRepo, toRosterJson, type RosterJson, type RosterPatch, type RosterRow } from "./rosterRepo";

export type ChildRow = RosterRow;
export type ChildJson = RosterJson;
export type ChildPatch = RosterPatch;

const repo = rosterRepo("child");

export const toChildJson = toRosterJson;
export const listChildren = (db: Queryable, familyId: string, includeArchived = false) => repo.list(db, familyId, includeArchived);
export const createChild = (tx: Tx, familyId: string, input: { name: string; color?: string | null }) => repo.create(tx, familyId, input);
export const updateChild = (db: Queryable, familyId: string, id: string, patch: ChildPatch) => repo.update(db, familyId, id, patch);
