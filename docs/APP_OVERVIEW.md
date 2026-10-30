# Homeschool Hub: app overview

Start here, then read [ROADMAP.md](ROADMAP.md) and [HOW_WE_WORK.md](HOW_WE_WORK.md).

## The product

Homeschool Hub is a **steering tool for the homeschool year**: a parent sees the shape of the whole year in seconds, corrects course when life happens, and gets their records with no extra work. It is a planning tool, not a daily to-do app; nothing in the core needs daily input. Around that core, optional modules (off by default) make it a full homeschool hub. [ROADMAP.md](ROADMAP.md) has the plan, the core checklist and the module rules.

The planned business model is freemium: Free covers one child, and the Family plan ($5.99/mo or $49/yr) adds unlimited children (`spec/SPEC.md`, "Free vs premium"). Billing is not built and waits until after the friends beta; friends get every Family feature free.

**The core is the year timeline** (`/timeline`):
- One lane per subject, with sub-lanes per child and sub-rows so bars never overlap.
- Semi-transparent bars. A bar's thickness shows daily effort: units per day × the assignment's effort weight per unit (1 point ≈ 2 minutes). How parents enter effort is being reworked (ROADMAP.md, "Effort").
- An "All subjects" bar pinned above the lanes shows the summed load.
- Zoom presets: Year / Fall / Spring / This month.
- A child filter.
- Tap a bar to edit it in the edit bar at the bottom, or drag it to change its dates.
- "+ Add assignment" in the timeline header.

**Supporting features:**
- **This Week**, with the optional "How did last week go?" check-in. The plan assumes scheduled work was done unless the parent says otherwise.
- **Recurring events and days off** (built in Sprint 2a).
- **Records** (planned optional module): attendance days, estimated hours, a book list and CSV export, all generated from the plan. None of it is in the code yet. Daily check-off logging is a later optional module, never required (ROADMAP.md, "Optional modules").

## Design principles

- Very simple and calm, never overwhelming. Show only what's essential: no extra helper text, badges or borders.
- Progressive disclosure with sensible defaults. Controls appear only when they're relevant; for example, the edit controls exist only once a bar is selected.
- A pastel, colour-blind-safe default palette, based on Okabe–Ito (T-01b). The "vivid" palette is opt-in.
- Maximum horizontal room: labels go above the lanes, not in a column, and the timeline runs edge to edge on phones. Tap targets are at least 44 px.

Every ticket has an acceptance criterion that checks nothing non-essential is shown (`docs/tickets/timeline/README.md`).

## Timeline label rules

- Each bar piece is named inside the bar, pinned left, and cut with "…" to fit (T-06, T-11, T-11c).
- A piece too thin for an inside name (under 13 px) gets its name above it instead. That name is left-aligned, cut to the piece's width, and its lowest letters end about 2 px above the bar.
- Only rows with such a name get extra space, and only as much as the name needs (T-11d, T-11e).

## Product rules

- **Schedule first.** Planning comes before logging. Logging is optional, and the plan doesn't depend on it (S2b-18, S2b-19).
- **No tedious entry.** A feature that needs parents to type a lot (lesson titles, required daily check-offs) stays out of the core.
- **The parent pilot gate was dropped** on 2026-10-28. Validation now runs through DeeDee's own use, then a friends beta with agreed go-public signals (ROADMAP.md). `docs/pilot/` is kept for history.
- **Logging is a record-keeping helper, never a compliance claim.** No copy may claim the app meets a state's requirements.
- **Payments and billing come only after live testing.**

## Tech stack

TypeScript everywhere, Node 20, npm workspaces.

| Part | What |
|---|---|
| `packages/engine` | `@hh/engine`: a pure, versioned scheduling engine with no I/O and no `Date` objects. The version is `ENGINE_VERSION` in `src/version.ts`. |
| `apps/api` | `@hh/api`: Fastify API (auth, roster, schedule data, check-ins, `/api/plan`). Uses zod. |
| `apps/web` | `@hh/web`: a Vite + React PWA with React Router 7, and Tailwind v4 without Preflight. shadcn/ui (`base-nova`, on Base UI) is used for the timeline. The timeline itself is a hand-drawn SVG in `src/features/timeline/`. |
| `db/` | Postgres 16 (Docker Compose): SQL migrations, runner, seed, demo family (`db/demo-family.ts`) and schema validation. |
| `scripts/` | `check.sh` (the full gate) and browser smoke scripts. |
| `docs/` | Tickets, progress, reviews and these guides. |
| CI | GitHub Actions, `.github/workflows/ci.yml`. |

Tests use Vitest. The engine is also tested under 7 time zones (`npm run test:tz`).

## Links

- Spec: [docs/spec/SPEC.md](spec/SPEC.md). Since 2026-10-30 the repo is the single source of truth for the spec and research; the shared Pages they were copied from are historical (`docs/spec/README.md`).
- Timeline Tools research (the timeline tickets call it "the Timeline Tools Page"): [docs/spec/timeline-tools-research.md](spec/timeline-tools-research.md).
- Competitor and pricing research: [docs/spec/competitor-and-pricing-research.md](spec/competitor-and-pricing-research.md).
- [ROADMAP.md](ROADMAP.md): what's done, what's next, and the open decisions.
- [HOW_WE_WORK.md](HOW_WE_WORK.md): roles, ticket format, local dev, rules.
- [REVIEW-GUIDE.md](REVIEW-GUIDE.md): run it and review it in about 5 minutes.
- [tickets/README.md](tickets/README.md) and [tickets/timeline/README.md](tickets/timeline/README.md): tickets by sprint.
- [progress/timeline.md](progress/timeline.md): the latest progress and decisions.
- [reviews/](reviews/): developer and tester reviews and verifications.
