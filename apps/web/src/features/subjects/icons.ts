/**
 * S8-11: the fixed list of subject icons (Phosphor Light). The keys are the API's (apps/api/src/http/subjectIcons.ts:
 * a test keeps the two lists equal). A subject whose `icon` is null shows its first letter instead.
 */
import type { Icon } from "@phosphor-icons/react";
import {
  BookOpen, Calculator, Camera, Cross, Flask, GlobeHemisphereWest, Heart, Leaf, MapTrifold, Microscope, MusicNotes, Palette, PawPrint,
  PencilSimple, PersonSimpleRun, PuzzlePiece, Rocket, Scroll, Star, Translate,
} from "@phosphor-icons/react";

export const SUBJECT_ICON_COMPONENTS = {
  book: BookOpen, calculator: Calculator, globe: GlobeHemisphereWest, flask: Flask, leaf: Leaf, music: MusicNotes, palette: Palette,
  pencil: PencilSimple, language: Translate, cross: Cross, running: PersonSimpleRun, map: MapTrifold, scroll: Scroll,
  microscope: Microscope, star: Star, heart: Heart, puzzle: PuzzlePiece, rocket: Rocket, paw: PawPrint, camera: Camera,
} as const satisfies Record<string, Icon>;

export type SubjectIconKey = keyof typeof SUBJECT_ICON_COMPONENTS;
export const SUBJECT_ICON_KEYS = Object.keys(SUBJECT_ICON_COMPONENTS) as SubjectIconKey[];

/** What a parent hears for each icon (the picker's labels). */
export const SUBJECT_ICON_LABELS: Record<SubjectIconKey, string> = {
  book: "Book", calculator: "Calculator", globe: "Globe", flask: "Flask", leaf: "Leaf", music: "Music", palette: "Palette", pencil: "Pencil",
  language: "Language", cross: "Cross", running: "Running", map: "Map", scroll: "Scroll", microscope: "Microscope", star: "Star",
  heart: "Heart", puzzle: "Puzzle", rocket: "Rocket", paw: "Paw print", camera: "Camera",
};

export const isIconKey = (k: unknown): k is SubjectIconKey => typeof k === "string" && k in SUBJECT_ICON_COMPONENTS;

/** The name rules the API applies when a subject is created without an icon (and the form previews as you type). */
const DEFAULTS: ReadonlyArray<readonly [SubjectIconKey, RegExp]> = [
  ["calculator", /(^|[^a-z])(math|maths|arithmetic|algebra|geometry|calculus)([^a-z]|$)/i],
  ["microscope", /(^|[^a-z])(biology|anatomy)([^a-z]|$)/i],
  ["leaf", /(^|[^a-z])(nature|botany|gardening|garden)([^a-z]|$)/i],
  ["flask", /(^|[^a-z])(science|chemistry|physics|astronomy)([^a-z]|$)/i],
  ["music", /(^|[^a-z])(music|piano|violin|guitar|singing|choir)([^a-z]|$)/i],
  ["scroll", /(^|[^a-z])(history|social studies|civics)([^a-z]|$)/i],
  ["globe", /(^|[^a-z])(geography)([^a-z]|$)/i],
  ["palette", /(^|[^a-z])(art|drawing|painting|crafts?)([^a-z]|$)/i],
  ["language", /(^|[^a-z])(foreign language|languages?|latin|spanish|french|german|greek|italian|hebrew)([^a-z]|$)/i],
  ["cross", /(^|[^a-z])(bible|scripture|religion|catechism|theology)([^a-z]|$)/i],
  ["running", /(^|[^a-z])(pe|p\.e\.|gym|sports?|physical education)([^a-z]|$)/i],
  ["pencil", /(^|[^a-z])(writing|spelling|grammar|handwriting|copywork|composition|dictation)([^a-z]|$)/i],
  ["book", /(^|[^a-z])(reading|literature|read|books?|poetry|phonics)([^a-z]|$)/i],
];

export const defaultIconFor = (name: string): SubjectIconKey | null => DEFAULTS.find(([, w]) => w.test(name))?.[0] ?? null;
