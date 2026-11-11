# Hosting plan

> **Status: proposal for Will and DeeDee (2026-11-06). Nothing here is built or deployed yet.** Hosting is on hold until Will says go (Will, 2026-11-05). Product work comes first: Sprint 18b, then Sprints 19, 20 and 21 (`progress/HANDOFF.md`, updated 2026-11-11). Those sprints do not block hosting if Will says go sooner. It is phase 2 of [ROADMAP.md](ROADMAP.md): private hosting for DeeDee first, nobody else until the friends beta. HOW_WE_WORK's rule stands: no public hosting or tunnels without DeeDee's approval, and agents never deploy on their own.

## 1. Summary

| | Choice |
|---|---|
| **Cloud** | AWS, one region (us-east-1 or us-east-2) |
| **API** | AWS App Runner running the API as a container (0.25 vCPU / 0.5 GB to start, min 1 instance) |
| **Database** | Amazon RDS for PostgreSQL 16, `db.t4g.micro`, single-AZ, 20 GB gp3, encrypted, automated backups with point-in-time recovery |
| **Web app** | The Vite build in a private S3 bucket behind CloudFront (HTTPS, caching) |
| **Secrets** | AWS Secrets Manager (database password, `SESSION_SECRET`) read by App Runner's instance role |
| **Infrastructure as code** | Terraform, in `infra/` in this repo |
| **Redis** | None. Not needed at this scale (see §7) |
| **Cost** | About $5/month during the RDS free-tier year, about $18–25/month after (§8) |
| **Data safety** | RPO about 5 minutes (point-in-time recovery), RTO about 30–60 minutes (restore to a new instance) |

Why this shape: managed enough for a two-person team (no servers to patch, no load balancer to run), inside the ~$20/month budget, strong backups, and a clear path to Multi-AZ later. Terraform keeps it reviewable and repeatable, which removes most misconfiguration risk.

## 2. Options considered

| Option | Better when… | Security | Data safety | Ops | Cost/mo |
|---|---|---|---|---|---|
| **App Runner + RDS + S3/CloudFront** (chosen) | Small team, low ops, strong backups, AWS learning value | Good if configured right; main risk is misconfiguration (mitigated by Terraform and the checklist in §5) | PITR, RPO ~5 min | Low | ~$5 (free tier) → ~$18–25 |
| Elastic Beanstalk (single instance) + RDS | You want EC2 control or Beanstalk practice | You patch the platform version; same RDS story | Same as above | Medium | similar; +$16+ with a load balancer |
| Lightsail single box (Postgres on it) | Lowest cost, and you'll run backups and patches yourself | You harden the OS, firewall and Postgres; the database sits on the internet-facing box | Daily snapshot, RPO up to 24 h | Medium–high | ~$7–12 |
| PaaS (Render, Fly, Railway) | Fastest setup, fewest knobs | Provider-managed; less network isolation control | Provider backups (varies by plan) | Lowest | ~$10–20 |

Terraform vs Beanstalk is not an either/or: Terraform is how we describe whatever we choose; App Runner (or Beanstalk) is what runs the API.

## 3. Architecture

```
            Parent's browser (HTTPS)
                     │
          ┌──────────┴───────────┐
          │                      │
   app.<domain>            api.<domain> (or app.<domain>/api via CloudFront)
   CloudFront ── S3 (private, OAC)   App Runner service (container, public HTTPS)
   (Vite build)                     │  VPC connector (egress into the VPC)
                                    ▼
                          RDS PostgreSQL 16 (private subnets, no public IP)
                          SG: 5432 only from the App Runner connector SG

   Secrets Manager: DATABASE_URL parts, SESSION_SECRET  → read by App Runner instance role
   CloudWatch Logs: App Runner logs (30-day retention)
   ECR: API container images (keep last 10)
```

- **Same-site cookies:** serve the API under the same site as the app (preferred: CloudFront routes `/api/*` to App Runner as a second origin, so the app and API share one domain and the session cookie stays first-party with `SameSite=Lax`). This avoids cross-site cookie and CORS work.
- **No NAT gateway.** App Runner's VPC connector reaches RDS inside the VPC; the API needs no other outbound internet access today. (A NAT gateway would add ~$30+/month.)

## 4. Code changes needed first (the held "hosting fixes in code")

These are in ROADMAP "Hosting fixes in code"; they become one small sprint before any deploy.

1. **Health check split.** `/api/health` today always returns 200. Add `/api/health/live` (process up) and `/api/health/ready` (a `SELECT 1` against Postgres with a short timeout). App Runner's health check uses `ready`.
2. **Graceful shutdown.** On SIGTERM: stop accepting requests, finish in-flight ones (with a timeout), close the Postgres pool. App Runner sends SIGTERM on deploys.
3. **Migration lock.** Wrap `db/migrate.ts` in a Postgres advisory lock so two starting instances can't both migrate; run migrations as an explicit deploy step (§6), not on every boot.
4. **Proxy-aware throttle.** Set Fastify `trustProxy` to trust App Runner/CloudFront's forwarded headers (and only those), so the login throttle limits by the real client IP. Move the throttle's counters to Postgres if we ever run more than one instance.
5. **Production start.** Build the API to JS (`tsc` or esbuild) and run `node dist/server.js` instead of `tsx`; a small `Dockerfile` (Node 20 slim, non-root user, `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT` from App Runner).
6. **Secure cookie.** Already on when `NODE_ENV=production` (`apps/api/src/auth/session.ts`); confirm `Secure`, `HttpOnly`, `SameSite=Lax` in the deployed response.
7. **Security headers.** Add `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, a basic `Content-Security-Policy` (fonts are self-hosted, so it can be strict), and `Cache-Control: no-store` on API responses (viewer responses already send it).
8. **Session cleanup** already runs (S14-04); confirm it runs in production.

## 5. Security checklist

**Network**
- RDS in private subnets, `publicly_accessible = false`.
- RDS security group: inbound 5432 **only** from the App Runner VPC connector's security group.
- S3 bucket private; CloudFront reads it via Origin Access Control; block public access on.
- HTTPS everywhere (CloudFront and App Runner certificates via ACM); HTTP redirects to HTTPS.

**Identity and secrets**
- App Runner instance role: read only the two secrets it needs (least privilege; no wildcards).
- Deploy role for CI (later) via GitHub OIDC, scoped to ECR push, App Runner deploy, and the S3/CloudFront paths. No long-lived AWS keys anywhere.
- Secrets only in Secrets Manager; never in Terraform state as plain variables (generate the DB password with `random_password` and store it straight into Secrets Manager; keep Terraform state in an encrypted, versioned S3 bucket with a DynamoDB lock table, access limited to Will).
- Root account: MFA on, not used day to day; a personal admin user or IAM Identity Center with MFA.

**Data**
- RDS encryption at rest (KMS, default key is fine) and TLS from the API (`sslmode=require`).
- Children's data: no analytics or third-party scripts; logs never include tokens, passwords or cookies (already redacted, S14-02).
- `X-Robots-Tag: noindex` on the whole site until going public.

**Accounts and app** (already built and tested in Sprints 14–17)
- Invite-only accounts, hashed tokens, throttled sign-in and joins, viewers deny-by-default, every route scoped to the session's account.

## 6. Deployment

**First deploy (by hand, with Will at the keyboard)**
1. `terraform apply` in `infra/` creates: VPC (2 private subnets, 2 AZs), RDS, Secrets, ECR, App Runner (with VPC connector), S3 + CloudFront, ACM certificates, Route 53 records (if the domain is in Route 53), CloudWatch log groups, AWS Budgets alert.
2. Build and push the API image to ECR.
3. **Run migrations** as a one-off: App Runner doesn't run one-off jobs, so either a temporary ECS Fargate task with the same image (`node dist/migrate.js`), or a short-lived local run through an SSM-port-forwarded bastion. Recommended: a tiny ECS task definition kept in Terraform for migrations only.
4. Create DeeDee's family with `create-family-invite` (run the same way as migrations) and send her the link by hand.
5. Build the web app (`npm run build -w @hh/web`) and sync `apps/web/dist` to S3; invalidate CloudFront.

**Later (CI)**
- On a tag or a manual "deploy" workflow: build image → push to ECR → run migrations task → update App Runner → build web → sync S3 → invalidate CloudFront. GitHub OIDC role; never on every push to main.

**Rollback**
- App Runner: redeploy the previous image tag (keep the last 10 in ECR).
- Web: re-sync the previous build (keep builds in S3 under versioned prefixes or enable bucket versioning).
- Database: migrations are forward-only; before every migration take a **manual RDS snapshot**, and restore from it if a migration goes wrong.

## 7. Redis

Not used. Sessions, undo and records are in Postgres; at this scale there's nothing worth caching. The one trigger is running **more than one API instance**: the login throttle's counters are in memory today, so they'd move to a Postgres table (cheaper and simpler than ElastiCache, which starts around $12+/month). Revisit only if load or features demand it.

## 8. Cost estimate

Approximate, from memory of 2026 list prices in us-east; **check the AWS Pricing Calculator before deciding.**

| Item | Free-tier year | After |
|---|---|---|
| RDS `db.t4g.micro`, single-AZ | $0 (750 h/month free) | ~$12–13 |
| RDS storage 20 GB gp3 + backups (≤ DB size free) | $0 | ~$2–3 |
| App Runner 0.25 vCPU / 0.5 GB, min 1, light traffic | ~$3–5 | ~$3–5 |
| S3 + CloudFront | ~$0–1 | ~$0–1 |
| Secrets Manager (2 secrets) | ~$1 | ~$1 |
| Route 53 hosted zone (+ domain ~$12/year) | ~$0.50 (+ $1) | ~$0.50 (+ $1) |
| ECR, CloudWatch Logs (30-day retention) | <$1 | <$1 |
| **Total** | **~$5–9** | **~$19–25** |

Cost guards: an **AWS Budgets** alert at $15 and $25/month to Will's email; no NAT gateway, no load balancer, no Multi-AZ until needed; log retention 30 days.

## 9. Data integrity and availability

- **Backups:** RDS automated backups, retention 14 days, point-in-time recovery (RPO ~5 minutes). Manual snapshot before every migration, kept 30 days.
- **Restore test (required before DeeDee relies on it):** restore the latest backup to a new instance, point a throwaway App Runner revision at it, sign in, check a family's plan and records match. Record the time it took (our real RTO) in `docs/reviews/`.
- **Availability:** single-AZ RDS means a few minutes' downtime in the weekly maintenance window (set to a quiet hour, e.g. Sunday 3–4am Central) and, rarely, a longer outage if the AZ fails (restore from backup). App Runner itself runs across AZs.
- **Upgrade path:** switch RDS to Multi-AZ (one setting; automatic failover in ~1–2 minutes, roughly doubles the database cost) when families depend on it daily, likely at going public.
- **Monitoring:** App Runner health checks; CloudWatch alarms on 5xx rate, RDS CPU and free storage, and the budget; alerts to Will's email.

## 10. Decisions needed (H1–H3 from the roadmap)

1. **H1, where to host:** this plan recommends AWS App Runner + RDS + S3/CloudFront. Will and DeeDee to confirm.
2. **H2, sessions:** keep the current server-side sessions in Postgres with an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (recommended; the cookie holds a random token, only its hash is stored). Confirm `SESSION_SECRET` from Secrets Manager.
3. **H3, time-zone fallback:** a bad stored time zone falls back to America/Chicago (as built). Keep it (recommended) or ask the family.
4. **Domain:** which domain (and whether to buy it in Route 53).
5. **Region:** us-east-2 (Ohio) or us-east-1 (N. Virginia); either is fine for US families.

## 11. Steps, in order

1. **Sprint: hosting fixes in code** (§4), with a tester pass. No AWS needed.
2. **Terraform module** in `infra/` (§3, §5), reviewed by Will; `terraform plan` only.
3. **Will approves**, DeeDee approves (HOW_WE_WORK), then `terraform apply` with Will at the keyboard (§6).
4. **Smoke test on the host:** sign in as a test family, run the smoke scenarios against the hosted URL (read-only where possible).
5. **Restore test** (§9). Record RTO.
6. **DeeDee's invite** sent by hand. Phase 2 done when she uses it on her phone and one restore has been tested.
7. **After hosting:** the calendar feed (ROADMAP), CI deploys, and later the friends beta (phase 4).
