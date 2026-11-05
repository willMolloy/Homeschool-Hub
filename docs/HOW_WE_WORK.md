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
  - Works on the sprint's branch and pushes there (pull/rebase first, never force); see Branches below.
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

## Branches

Decided by DeeDee on 2026-11-03: **one branch per sprint; a PR to `main` only after the sprint passes testing.**

- Each sprint (with its fix sprint, for example 9 and 9b) is built on its own branch, such as `hh2/sprint-9b`. Commits are pushed to that branch as they are made; nobody pushes to `main` directly.
- When the Tester's re-test passes, the sprint's branch gets one PR to `main`. It is merged only after that, and never force-pushed.
- The next sprint's branch starts from `main` once that PR is merged.

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

## Accounts and the command line

Accounts are invite-only and there is no admin screen: Will and DeeDee run these commands from `apps/api` (or with `-w @hh/api` from the repo root). They read `DATABASE_URL` and `SESSION_SECRET` from `.env`. Nothing is emailed or sent anywhere: share a link by hand. A token, link or password is never logged; the commands print a link once and never print a password.

| Command | What it does |
|---------|--------------|
| `npm run create-family-invite -w @hh/api` | Makes an invite for a **new family** and prints its link once: `${PUBLIC_BASE_URL or http://localhost:5173}/join/<token>`. Single use, 7 days. Only the token's SHA-256 is stored, so a lost link means making another. |
| `... create-family-invite -- list` | The open invites by id (kind, made, expires). No links. |
| `... create-family-invite -- revoke <id>` | Cancels an open invite (the full id, or its first 8 or more characters). The link then shows the same plain message as an expired one. |
| `npm run set-parent-login -w @hh/api -- <email>` | Resets that parent's password (prompts without echo; from a pipe it reads the first line). Signs that parent out everywhere. |
| `npm run set-family-login -w @hh/api -- <familyId> <email>` | The old name, kept as an alias: sets the family's first parent's email and password (creating a first parent when there is none). |
| `npm run remove-parent -w @hh/api -- <email>` | Removes that parent and ends their sessions. Refuses to remove a family's last parent. (A viewer is removed by a parent in Family settings, or leaves themselves; this command also removes a viewer-only login.) |

A second parent is invited by the family itself, from Family settings, Parents, "Invite another parent". Removing a parent is not in the app (Will): it is the `remove-parent` command.

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
4. Read the latest progress doc (now [progress/sprint-9.md](progress/sprint-9.md)), including its Decisions sections, and [progress/HANDOFF.md](progress/HANDOFF.md) for where things stand.
5. Check out the current sprint's branch (see Branches). Run `git log --oneline -20` and `git status`. Then `git pull --rebase` and run `bash scripts/check.sh` before changing anything.
