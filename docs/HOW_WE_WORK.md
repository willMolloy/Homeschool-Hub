# How we work

Read [APP_OVERVIEW.md](APP_OVERVIEW.md) and [ROADMAP.md](ROADMAP.md) first.

## Roles

- **Product Owner.**
  - Owns the vision.
  - Splits work into sprints of small tickets. Each ticket covers one component and gives the full detail.
  - Records decisions in the ticket and progress docs.
- **Developer.**
  - Builds one ticket per commit, using SOLID and best practices.
  - Runs `bash scripts/check.sh` before each commit.
  - Pushes normally to `main` (pull/rebase first, never force) and confirms CI is green.
  - When a ticket is ambiguous, makes the conservative call and records it under "Decisions" in the progress doc.
- **Tester.**
  - Independently verifies each sprint against its acceptance criteria and edge cases.
  - Writes a report in `docs/reviews/` (e.g. `sprint-2b-verification.md`).
  - Its findings become fix tickets (e.g. `docs/tickets/sprint-2c-fixes/`).
- **DeeDee.** Tests by hand at milestones and makes the product calls. DeeDee approves what gets built.

## Tickets, progress and reviews

- **Tickets** go in `docs/tickets/<sprint>/`, one folder per sprint, each with a `README.md` table. The table lists # | Ticket | Depends on | Size, with sizes XS < 1 h, S a few hours, M half a day.
- **File names:** `<ID>-<kebab-title>.md`, e.g. `S2c-01-block-a-week-start-change-once-weeks-are-checked-in.md` or `T-11e-outside-names-closer.md`. A follow-up gets a letter suffix (T-11 → T-11b).
- **Ticket format:**
  - a title line `# <ID> — <Title>`;
  - `**Source:** … **Depends on:** … **Size:** …`;
  - the sections Goal (one sentence), Context, Steps, Done when (including "only what's essential"), Tests and Out of scope.
  - If a title would need "and", split it into two tickets.
- **Progress:** each sprint has `docs/progress/<sprint>.md` with a table: Ticket | Commit | Notes.
  - The newest row says "(this commit)".
  - The next commit replaces that with the hash.
  - A "Decisions" section records the conservative calls.
  - Screenshots go in `docs/progress/screens/`.
- **Reviews and verifications** go in `docs/reviews/`.

## Local dev and preview

You need Node 20 (`.nvmrc`), Docker with Compose, and `openssl`. Details are in [REVIEW-GUIDE.md](REVIEW-GUIDE.md) and the root README.

```sh
docker compose up -d db                           # Postgres 16; wait for "healthy" in: docker compose ps
cp .env.example .env                              # set SESSION_SECRET yourself (openssl rand -hex 32); .env is git-ignored
docker compose exec db createdb -U hh hh_test     # once, for the integration tests and the gate
npm ci
npm run demo                                      # resets + seeds hh_dev, starts API (:3000) and web (:5173), prints the demo login
bash scripts/check.sh                             # the full gate: lint, typecheck, build, db reset, tests, test:tz, db validate → "ALL GREEN"
```

- Use `npm run dev:web` and `npm run dev:api` to run the servers on their own.
- `npm test` runs the tests alone.
- Never commit or print secrets: `.env`, session secrets, tokens.

## Rules

- Contact no one unless DeeDee explicitly asks and then confirms a second time.
- No public tunnels or hosting without DeeDee's approval.
- Check weekly usage at each handoff, and tell DeeDee as it nears the limit.
- Shared Pages get a changelog at the top.
- Never `git add -A`. Stage the ticket's files by name, and leave files another role is editing alone.

## Starting a new session

1. Read [APP_OVERVIEW.md](APP_OVERVIEW.md).
2. Read [ROADMAP.md](ROADMAP.md).
3. Read this guide.
4. Read the latest progress doc (now [progress/timeline.md](progress/timeline.md)), including its Decisions section.
5. Run `git log --oneline -20` and `git status`. Then `git pull --rebase` and run `bash scripts/check.sh` before changing anything.
