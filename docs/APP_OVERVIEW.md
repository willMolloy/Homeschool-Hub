# Homeschool Hub: app overview

Start here, then read [ROADMAP.md](ROADMAP.md) and [HOW_WE_WORK.md](HOW_WE_WORK.md).

## The product

Homeschool Hub is a freemium homeschool planner. Free covers one child; the Family plan ($5.99/mo or $49/yr) adds unlimited children, so the paywall comes at the 2nd child (`spec/SPEC.md`, "Free vs premium"). It is not built yet.

**The core is the year timeline** (`/timeline`):
- One lane per subject, with sub-lanes per child and sub-rows so bars never overlap.
- Semi-transparent bars. A bar's thickness shows daily workload: units per day × the assignment's effort weight.
- An "All subjects" bar pinned above the lanes shows the summed load.
- Zoom presets: Year / Fall / Spring / This month.
- A child filter.
- Tap a bar to edit it in the edit bar at the bottom, or drag it to change its dates.
- "+ Add assignment" in the timeline header.

**Supporting features:**
- **This Week**, with the optional "How did last week go?" check-in. The plan assumes scheduled work was done unless the parent says otherwise.
- **Recurring events and days off** (built in Sprint 2a).
- **Hour logging and export.** The spec has one-tap check-off, quick add, hour and attendance totals, CSV export (free) and PDF records (Family plan) (`spec/SPEC.md`, "Low-friction logging" and "Free vs premium"). None of it is in the code yet, and the repo has no export code.

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
- **The parent pilot gate was dropped** on 2026-10-28. DeeDee tests personally. `docs/pilot/` is kept for history.
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

- Spec: [docs/spec/SPEC.md](spec/SPEC.md), copied from the [Product Spec Page](https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/bb34c3a6-0776-400f-8153-0208d3dd507f).
- Timeline Tools Page (the timeline tickets cite it): [docs/spec/timeline-tools-research.md](spec/timeline-tools-research.md), copied from [the Page](https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/3f0a3869-f09a-4df5-b7ff-317a49259f2c).
- Competitor and pricing research: [docs/spec/competitor-and-pricing-research.md](spec/competitor-and-pricing-research.md), copied from [the Page](https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/93025aad-a8f8-42ef-aab9-71942b9f2a14).
- The repo copies are the working reference until go-live, when `docs/spec/` will be removed (`docs/spec/README.md`).
- [ROADMAP.md](ROADMAP.md): what's done, what's next, and the open decisions.
- [HOW_WE_WORK.md](HOW_WE_WORK.md): roles, ticket format, local dev, rules.
- [REVIEW-GUIDE.md](REVIEW-GUIDE.md): run it and review it in about 5 minutes.
- [tickets/README.md](tickets/README.md) and [tickets/timeline/README.md](tickets/timeline/README.md): tickets by sprint.
- [progress/timeline.md](progress/timeline.md): the latest progress and decisions.
- [reviews/](reviews/): developer and tester reviews and verifications.
