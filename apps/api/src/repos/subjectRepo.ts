import type { Queryable } from "../db";
import { rosterRepo, toRosterJson, type RosterJson, type RosterPatch, type RosterRow } from "./rosterRepo";

export type SubjectRow = RosterRow;
export type SubjectJson = RosterJson;
export type SubjectPatch = RosterPatch;

const repo = rosterRepo("subject");

export const toSubjectJson = toRosterJson;
export const listSubjects = (db: Queryable, familyId: string, includeArchived = false) => repo.list(db, familyId, includeArchived);
export const createSubject = (db: Queryable, familyId: string, input: { name: string; color?: string | null }) => repo.create(db, familyId, input);

/** DB index enforcing one active subject per (family, case-insensitive trimmed name). */
export const SUBJECT_NAME_INDEX = "subject_family_name_uq";
export const updateSubject = (db: Queryable, familyId: string, id: string, patch: SubjectPatch) => repo.update(db, familyId, id, patch);
