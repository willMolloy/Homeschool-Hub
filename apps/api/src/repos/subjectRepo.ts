import type { Queryable } from "../db";
import { rosterRepo, toRosterJson, type RosterJson, type RosterPatch, type RosterRow } from "./rosterRepo";

export type SubjectRow = RosterRow;
export type SubjectJson = RosterJson;
export type SubjectPatch = RosterPatch;

const repo = rosterRepo("subject");

export const toSubjectJson = toRosterJson;
export const listSubjects = (db: Queryable, familyId: string, includeArchived = false) => repo.list(db, familyId, includeArchived);
